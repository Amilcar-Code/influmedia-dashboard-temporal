import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { InfluencersService } from '../../services/influencers.service';
import { Influencer } from '../../models/influencer.model';

import { Auth } from '@angular/fire/auth';
import { authState } from '@angular/fire/auth';
import { firstValueFrom, filter } from 'rxjs';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard-temporal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './dashboard-temporal.html',
  styleUrls: ['./dashboard-temporal.scss']
})
export class DashboardTemporal implements OnInit {

  private fb   = inject(FormBuilder);
  private svc  = inject(InfluencersService);
  private auth = inject(Auth);

  cols = ['email', 'name', 'country', 'actions'] as const;
  rows = signal<Influencer[]>([]);
  loading = signal(false);
  isEnd   = signal(false);
  lastEmail: string | null = null;

  // 🔎 modo de búsqueda ('name' | 'email')
  searchMode: 'name' | 'email' = 'name';

  // form y edición
  editing = signal<boolean>(false);
  editingId: string | null = null;

  form = this.fb.group({
    id: [''],
    email: ['', [Validators.required, Validators.email]],
    name: [''],
    country: [''],
    address: [''],
    birthDate: [''],
    phone1: [''],
    phone2: [''],
    profession: [''],
    civilStatus: [''],
    taxpayerType: [''],
    facturaSimple: [''],
    idNumber: [''],
    invoiceNote: [''],
    bank: [''],
    accountName: [''],
    accountNumber: [''],
    accountType: [''],
    accountCurrency: [''],
    swift: [''],
    campaignNote: [''],
  });

  async ngOnInit() {
    try { await firstValueFrom(authState(this.auth).pipe(filter(u => !!u))); } catch {}
    await this.reload();
  }

  private mapToForm(r: Partial<Influencer>) {
    return {
      id: r.id ?? '',
      email: r.email ?? '',
      name: r.name ?? '',
      country: r.country ?? '',
      address: r.address ?? '',
      birthDate: r.birthDate ?? '',
      phone1: r.phone1 ?? '',
      phone2: r.phone2 ?? '',
      profession: r.profession ?? '',
      civilStatus: r.civilStatus ?? '',
      taxpayerType: r.taxpayerType ?? '',
      facturaSimple: (r.facturaSimple as any) ?? '',
      idNumber: r.idNumber ?? '',
      invoiceNote: r.invoiceNote ?? '',
      bank: r.bank ?? '',
      accountName: r.accountName ?? '',
      accountNumber: r.accountNumber ?? '',
      accountType: r.accountType ?? '',
      accountCurrency: r.accountCurrency ?? '',
      swift: r.swift ?? '',
      campaignNote: r.campaignNote ?? '',
    };
  }

  private showError(title: string, err: unknown) {
    console.error(title, err);
    const msg = (err as any)?.message ?? String(err);
    Swal.fire({ icon: 'error', title, text: msg });
  }
  private showOK(title: string, text = '') {
    Swal.fire({ icon: 'success', title, text, timer: 1200, showConfirmButton: false });
  }

  async reload() {
    try {
      this.rows.set([]);
      this.lastEmail = null;
      this.isEnd.set(false);
      await this.loadMore();
    } catch (err) {
      this.showError('Cargando datos', err);
    }
  }

  async loadMore() {
    if (this.isEnd()) return;
    this.loading.set(true);
    try {
      const { items, lastEmail, ended } = await this.svc.listChunk(300, this.lastEmail);
      this.rows.set([...this.rows(), ...items]);
      this.lastEmail = lastEmail;
      this.isEnd.set(ended);
    } catch (err) {
      this.showError('Cargar más', err);
    } finally {
      this.loading.set(false);
    }
  }

  async onSearch(term: string) {
    const q = term.trim();
    if (!q) return this.reload();
    this.loading.set(true);
    try {
      const found = this.searchMode === 'email'
        ? await this.svc.searchByEmail(q, 300)
        : await this.svc.searchByName(q, 300);
      this.rows.set(found);
      this.isEnd.set(true);
    } catch (err: any) {
      this.showError('Buscar', err);
    } finally {
      this.loading.set(false);
    }
  }

  new() {
    this.editingId = null;
    this.form.reset(this.mapToForm({}) as any);
    this.editing.set(true);
    setTimeout(() => document.getElementById('formPanel')?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  edit(row: Influencer) {
    this.editingId = row.id ?? null;
    this.form.reset(this.mapToForm(row) as any);
    this.editing.set(true);
    setTimeout(() => document.getElementById('formPanel')?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  cancel() {
    this.editingId = null;
    this.editing.set(false);
  }

  async save() {
    const v = this.form.getRawValue() as Influencer;
    delete (v as any).id;
    try {
      if (this.editingId) {
        await this.svc.update(this.editingId, v);
        this.showOK('Actualizado');
      } else {
        await this.svc.create(v);
        this.showOK('Creado');
      }
      this.editingId = null;
      this.editing.set(false);
      await this.reload();
    } catch (err) {
      this.showError('Guardar', err);
    }
  }

  async remove(row: Influencer) {
    if (!row.id) return;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Eliminar ${row.email}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
      await this.svc.remove(row.id);
      this.rows.set(this.rows().filter(r => r.id !== row.id));
      this.showOK('Eliminado');
    } catch (err) {
      this.showError('Eliminar', err);
    }
  }
}
