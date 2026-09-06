import type { Money } from './api';

export type { Money };

export type ImageRole =
  | 'product' | 'front' | 'side' | 'detail' | 'texture' | 'scale' | 'lifestyle'
  | 'packaging' | 'hero' | 'thumbnail' | 'craftsmanship' | 'brand-story' | 'seo' | 'og';

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
  role: ImageRole;
  blurDataUrl: string | null;
  isPrimary: boolean;
  srcset: { width: number; url: string }[];
  thumbnailUrl: string;
  /** True while a placeholder stands in for real brand photography. */
  isIllustrative: boolean;
  attribution: { author?: string; license?: string; url?: string } | null;
};

export type Availability = {
  available: number | null;
  isOutOfStock: boolean;
  isLowStock: boolean;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  trackInventory: boolean;
};

export type Badge = {
  type: 'out-of-stock' | 'low-stock' | 'best-seller' | 'new' | 'one-of-a-kind';
  label: string;
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  price: Money;
  compareAtPrice: Money | null;
  discountPercent: number;
  image: ProductImage | null;
  hoverImage: ProductImage | null;
  category: { name: string; slug: string } | null;
  rating: { average: number; count: number };
  badges: Badge[];
  availability: Availability | null;
  isOutOfStock: boolean;
  material: string | null;
  dimensions: Dimensions | null;
};

export type Dimensions = {
  height?: number;
  width?: number;
  depth?: number;
  diameter?: number;
  unit: 'cm' | 'in';
};

export type Variant = {
  id: string;
  sku: string;
  name: string;
  options: { name: string; value: string }[];
  price: Money;
  compareAtPrice: Money | null;
  weight: { value: number; unit: string } | null;
  dimensions: Dimensions | null;
  image: ProductImage | null;
  isDefault: boolean;
  availability: Availability | null;
};

export type SpecificationGroup = { group: string; items: { name: string; value: string }[] };

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  productStory: string | null;
  craftsmanshipStory: string | null;
  handmadeVariationNote: string | null;
  price: Money;
  compareAtPrice: Money | null;
  currency: string;
  discountPercent: number;
  images: ProductImage[];
  video: { url: string; thumbnailUrl?: string; title?: string } | null;
  variants: Variant[];
  defaultVariantId: string | null;
  hasVariants: boolean;
  category: { name: string; slug: string } | null;
  collections: { title: string; slug: string }[];
  tags: string[];
  specifications: SpecificationGroup[];
  material: string;
  finish: string | null;
  color: string | null;
  capacity: string | null;
  usage: string[];
  dimensions: Dimensions | null;
  weight: { value: number; unit: string } | null;
  isFoodSafe: boolean;
  isWatertight: boolean;
  isHandmade: boolean;
  isOneOfAKind: boolean;
  origin: { city: string; countryCode: string };
  careInstructions: string | null;
  packagingInformation: string | null;
  shippingInformation: string | null;
  isFragile: boolean;
  excludedCountryCodes: string[];
  rating: { average: number; count: number; distribution: Record<string, number> };
  badges: Badge[];
  isOutOfStock: boolean;
  availability: Availability | null;
  seo: Seo;
  breadcrumbs: { label: string; href: string }[];
  isPreview?: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type Seo = {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: ProductImage | null;
  noIndex: boolean;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantName: string | null;
  slug: string;
  image: ProductImage | null;
  quantity: number;
  unitPrice: Money;
  compareAtPrice: Money | null;
  lineTotal: Money;
  savedForLater: boolean;
  availability: Availability | null;
  maxQuantity: number;
};

export type CartNotice = {
  type: 'item-removed' | 'price-changed' | 'coupon-removed';
  message: string;
  name?: string;
  sku?: string;
  code?: string;
};

export type Cart = {
  id: string;
  token: string;
  items: CartItem[];
  savedForLater: CartItem[];
  currency: string;
  baseCurrency: string;
  countryCode: string | null;
  coupon: { code: string; discount: Money } | null;
  selectedShipping: SelectedShipping | null;
  totals: {
    subtotal: Money;
    discount: Money;
    shipping: Money;
    tax: Money;
    duties: Money;
    total: Money;
    itemCount: number;
  };
  notices: CartNotice[];
  isEmpty: boolean;
};

export type SelectedShipping = {
  methodCode: string;
  methodName: string;
  serviceLevel?: string;
  price: Money;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  incoterm: 'DDP' | 'DDU';
};

export type ShippingOption = {
  methodCode: string;
  methodName: string;
  description?: string;
  carrier: string;
  serviceLevel: string;
  price: Money;
  isFree: boolean;
  isTracked: boolean;
  incoterm: 'DDP' | 'DDU';
  minDeliveryDays: number;
  maxDeliveryDays: number;
  estimatedDeliveryFrom: string;
  estimatedDeliveryTo: string;
};

export type ShippingQuote = {
  countryCode: string;
  countryName: string;
  zone: { id: string; code: string; name: string };
  weightGrams: number;
  options: ShippingOption[];
  reason: string | null;
  duties: { rate: number; amount: Money; label: string | null; isEstimate?: boolean };
};

export type Address = {
  label?: string;
  firstName: string;
  lastName?: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  regionCode?: string;
  postalCode?: string;
  countryCode: string;
  phone?: string;
  email?: string;
  deliveryNotes?: string;
};

export type Country = {
  code: string;
  name: string;
  phoneCode: string;
  flag: string;
  currency: string;
  continent: string;
  isShippingSupported: boolean;
};

export type CountryDetail = Country & {
  locale: string;
  restrictionReason: string | null;
  addressForm: {
    regionLabel: string;
    regionRequired: boolean;
    regions: { code: string; name: string }[];
    postalCodeLabel: string;
    postalCodeRequired: boolean;
    postalCodePattern: string | null;
  };
  taxLabel: string;
  estimatedDutyRate: number;
};

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  exponent: number;
  rateUpdatedAt: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: string;
  fulfillmentStatus: string;
  canRetryPayment: boolean;
  email: string;
  currency: string;
  items: {
    id: string;
    sku: string;
    name: string;
    variantName: string | null;
    slug: string;
    image: { url: string; alt: string } | null;
    quantity: number;
    unitPrice: Money;
    lineTotal: Money;
  }[];
  totals: {
    subtotal: Money;
    discount: Money | null;
    shipping: Money | null;
    duties: Money | null;
    total: Money;
    refunded: Money | null;
    itemCount: number;
  };
  coupon: { code: string; discount: Money } | null;
  shippingAddress: Address;
  shippingMethod: (SelectedShipping & { carrier?: string; estimatedDeliveryFrom?: string; estimatedDeliveryTo?: string }) | null;
  timeline: { type: string; message: string; at: string }[];
  shipments?: Shipment[];
  placedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  isGift: boolean;
};

export type Shipment = {
  shipmentNumber: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  shippedAt: string | null;
  estimatedDeliveryFrom: string | null;
  estimatedDeliveryTo: string | null;
  deliveredAt: string | null;
  events: { status: string; description: string; location?: string; at: string }[];
};

export type PaymentMethod = {
  provider: 'stripe' | 'phonepe' | 'cod';
  label: string;
  flow: 'inline' | 'redirect' | 'cod';
  logo: string;
};

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorCountryCode: string | null;
  isVerifiedPurchase: boolean;
  images: { url: string; alt: string }[];
  helpfulCount: number;
  response: { body: string; at: string } | null;
  product?: { name: string; slug: string } | null;
  createdAt: string;
};

// ── Content ─────────────────────────────────────────────────────────────────

export type ContentBlock = {
  id: string;
  blockType: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image: ProductImage | null;
  images: ProductImage[];
  cta: { label: string; href: string } | null;
  secondaryCta: { label: string; href: string } | null;
  theme: 'light' | 'dark' | 'clay' | 'ink';
  data: any;
  products?: ProductCard[];
  collection?: { title: string; slug: string; subtitle: string | null; heroImage: ProductImage | null };
  reviews?: Review[];
};

export type ContentPage = {
  key: string;
  type: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  heroImage: ProductImage | null;
  blocks: ContentBlock[];
  seo: Omit<Seo, 'keywords'> & { keywords?: string[] };
  author: string | null;
  readingMinutes: number | null;
  tags: string[];
  publishedAt: string | null;
  updatedAt: string | null;
};

export type Collection = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  story?: string | null;
  heroImage: ProductImage | null;
  seo?: Partial<Seo>;
  productCount?: number;
  isFeatured?: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  kind: 'craft' | 'product-type' | 'use-case';
  parentId: string | null;
  level: number;
  shortDescription: string | null;
  image: { url: string; alt: string } | null;
  productCount: number;
  showInNavigation: boolean;
};

export type Facets = {
  productTypes: { slug: string; label: string; count: number }[];
  materials: { value: string; count: number }[];
  finishes: { value: string; count: number }[];
  priceRange: { min: number; max: number } | null;
  inStockCount: number;
};

export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  phone?: string;
  role: string;
  addresses: Address[];
  defaultShippingAddressIndex: number;
  preferredCurrency?: string;
  countryCode?: string;
  marketingOptIn: boolean;
  emailVerifiedAt: string | null;
};
