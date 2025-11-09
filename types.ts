export enum ItemStatus {
  Pending = 'PENDING',
  Bought = 'BOUGHT',
}

export enum Unit {
  Kg = 'کیلوگرم',
  Gram = 'گرم',
  Liter = 'لیتر',
  Ml = 'میلی‌لیتر',
  Piece = 'عدد',
  Pack = 'بسته',
  Box = 'جعبه',
  Bottle = 'بطری',
  Can = 'قوطی',
  Jar = 'شیشه',
  Dozen = 'دوجین',
  Sheet = 'برگ',
  Roll = 'رول',
  Bag = 'کیسه',
  Bunch = 'دسته',
  Carton = 'کارتن',
  Sachet = 'ساشه',
  Bar = 'قالب',
}

export enum CafeCategory {
    Dairy = 'لبنیات',
    Produce = 'میوه و سبزیجات',
    Bakery = 'نان و شیرینی',
    DryGoods = 'خشکبار و حبوبات',
    Meat = 'گوشت و مرغ',
    Beverages = 'نوشیدنی‌ها',
    Cleaning = 'لوازم بهداشتی و نظافتی',
    Other = 'متفرقه',
}

export enum PaymentStatus {
  Paid = 'پرداخت شده',
  Due = 'پرداخت نشده',
}

export enum PaymentMethod {
  Cash = 'نقد',
  Card = 'کارت',
  Transfer = 'انتقال بانکی',
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
}


export interface ShoppingItem {
  id: string;
  name: string;
  amount: number;
  unit: Unit;
  status: ItemStatus;
  category: string;
  paidPrice?: number;
  purchasedAmount?: number;
  vendorId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  estimatedPrice?: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string; // Storing as ISO string for easier serialization
  items: ShoppingItem[];
}

export interface AggregatedShoppingItem {
  name: string;
  unit: Unit;
  category: string;
  vendorId?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  totalAmount: number;
  totalPrice: number;
  purchaseHistory: { date: Date, pricePerUnit: number }[];
}

export interface OcrParsedItem {
    name: string;
    quantity: number;
    price: number;
    unit?: Unit;
    suggestedCategory?: string;
}

export interface OcrResult {
  date: string; // Jalali date string YYYY/MM/DD
  items: OcrParsedItem[];
}


export interface RestockSuggestion {
    name: string;
    unit: Unit;
    category: string;
    lastPurchaseDate: string;
    avgPurchaseCycleDays: number;
}

export interface SmartSuggestion extends RestockSuggestion {
    reason: string;
    priority: 'high' | 'medium' | 'low';
}


export interface PendingPaymentItem extends ShoppingItem {
    listId: string;
    listName: string;
    purchaseDate: string;
}

export interface RecentPurchaseItem extends ShoppingItem {
    listId: string;
    purchaseDate: string;
}

export interface MasterItem {
  name: string;
  unit: Unit;
  category: string;
  lastPricePerUnit: number;
  totalQuantity: number;
  totalSpend: number;
  purchaseCount: number;
}


export interface SummaryData {
  kpis: {
    totalSpend: number;
    totalItems: number;
    avgDailySpend: number;
    topCategory: { name: string; amount: number } | null;
    topVendor: { name: string; amount: number } | null;
  };
  charts: {
    spendingOverTime: { labels: string[]; data: number[] };
    spendingByCategory: { labels: string[]; data: number[] };
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface User {
  id: string;
  username: string;
}

export interface AuthSlice {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export interface ShoppingState {
  isHydrating: boolean;
}
