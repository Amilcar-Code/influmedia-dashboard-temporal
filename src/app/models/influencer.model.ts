export interface Influencer {
  id?: string;
  createdAt?: any;
  updatedAt?: any;

  // campos visibles
  email?: string;
  name?: string;
  country?: string;
  address?: string;
  birthDate?: string;

  phone1?: string;
  phone2?: string;
  profession?: string;
  civilStatus?: string;

  taxpayerType?: string;
  facturaSimple?: string | boolean;
  idNumber?: string;
  invoiceNote?: string;

  bank?: string;
  accountName?: string;
  accountNumber?: string;
  accountType?: string;
  accountCurrency?: string;
  swift?: string;

  campaignNote?: string;

  // 🔎 campos auxiliares para búsqueda (minúsculas)
  nameLower?: string;
  emailLower?: string;
}
