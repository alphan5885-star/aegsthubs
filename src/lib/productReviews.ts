export interface ProductReview {
  id: string;
  product_id: string;
  rating: number;
  comment: string;
  username: string;
  created_at: string;
}

// Helper to load reviews for a product
export const getProductReviews = (productId: string): ProductReview[] => {
  const saved = localStorage.getItem(`aeigs_product_reviews_${productId}`);
  if (saved) {
    return JSON.parse(saved);
  }
  
  // Seed realistic initial reviews for each product so the page feels alive immediately
  const seed: ProductReview[] = [
    {
      id: `seed-1-${productId}`,
      product_id: productId,
      rating: 5,
      comment: "MÜKEMMEL BİR ÜRÜN, HIZLI TESLİMAT VE TAMAMEN ŞİFRELİ SEVKİYAT. ŞİDDETLE TAVSİYE EDERİM!",
      username: "ANON_BUYER_99",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `seed-2-${productId}`,
      product_id: productId,
      rating: 4,
      comment: "İletişim harikaydı, teslimat sorunsuz ve gizlilik üst düzeyde sağlandı. Puanım 4/5.",
      username: "CYBER_NOMAD",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  localStorage.setItem(`aeigs_product_reviews_${productId}`, JSON.stringify(seed));
  
  // Update the global averages as well
  updateProductAverageRating(productId, seed);
  
  return seed;
};

// Helper to add a review
export const addProductReview = (productId: string, rating: number, comment: string, username: string): ProductReview => {
  const reviews = getProductReviews(productId);
  const newReview: ProductReview = {
    id: crypto.randomUUID(),
    product_id: productId,
    rating,
    comment: comment.trim(),
    username: username || "ANON_USER",
    created_at: new Date().toISOString()
  };
  
  reviews.unshift(newReview);
  localStorage.setItem(`aeigs_product_reviews_${productId}`, JSON.stringify(reviews));
  
  // Update the global averages
  updateProductAverageRating(productId, reviews);
  
  return newReview;
};

// Helper to get average rating for a single product
export const getProductAverageRating = (productId: string): { avg: number; count: number } => {
  const reviews = getProductReviews(productId);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    avg: Number((sum / reviews.length).toFixed(1)),
    count: reviews.length
  };
};

// Update global product averages index for fast retrieval in listings
const updateProductAverageRating = (productId: string, reviews: ProductReview[]) => {
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Number((sum / reviews.length).toFixed(1));
  
  const allAveragesSaved = localStorage.getItem("aeigs_product_averages");
  const averages = allAveragesSaved ? JSON.parse(allAveragesSaved) : {};
  averages[productId] = { avg, count: reviews.length };
  localStorage.setItem("aeigs_product_averages", JSON.stringify(averages));
};

// Get global index of averages for all products
export const getGlobalProductAverages = (): Record<string, { avg: number; count: number }> => {
  const saved = localStorage.getItem("aeigs_product_averages");
  if (saved) return JSON.parse(saved);
  return {};
};
