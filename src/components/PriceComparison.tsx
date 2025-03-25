import { Price } from "@/utils/productData";
import { stores } from "@/utils/storeData";
import { cn } from "@/lib/utils";

interface PriceComparisonProps {
  prices: Price[];
  detailed?: boolean;
  compareStores?: boolean;
}

export const PriceComparison = ({ 
  prices, 
  detailed = false, 
  compareStores = false 
}: PriceComparisonProps) => {
  // Sort prices from lowest to highest
  const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedPrices[0];
  const highestPrice = sortedPrices[sortedPrices.length - 1];

  // Format number with commas and 2 decimal places
  const formatPrice = (price: number) => {
    return price.toLocaleString('es-CR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Get store details by id
  const getStore = (storeId: string) => {
    return stores.find(store => store.id === storeId);
  };

  // Calculate savings between stores
  const calculateSavings = () => {
    if (sortedPrices.length < 2) return null;
    
    const saving = highestPrice.price - lowestPrice.price;
    const savingPercentage = Math.round((saving / highestPrice.price) * 100);
    
    return {
      amount: saving,
      percentage: savingPercentage,
      lowestStoreId: lowestPrice.storeId,
      highestStoreId: highestPrice.storeId,
    };
  };

  const savings = calculateSavings();

  return (
    <div className="space-y-2">
      {compareStores && savings && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg dark:bg-green-900/20 dark:border-green-900/30">
          <h4 className="text-green-700 dark:text-green-400 font-medium mb-1">Price Comparison</h4>
          <p className="text-sm text-green-700 dark:text-green-400">
            Save <span className="font-bold">{lowestPrice.currency}{formatPrice(savings.amount)}</span> ({savings.percentage}%) 
            by shopping at <span className="font-bold">{getStore(savings.lowestStoreId)?.name}</span> instead of {getStore(savings.highestStoreId)?.name}.
          </p>
        </div>
      )}
      
      {detailed ? (
        <div className="space-y-3">
          {!compareStores && <h4 className="text-sm font-medium">Price Comparison</h4>}
          <div className="space-y-1">
            {sortedPrices.map((price) => {
              const store = getStore(price.storeId);
              const isLowest = price.price === lowestPrice.price;
              const isHighest = price.price === highestPrice.price;
              
              return (
                <div 
                  key={price.storeId}
                  className={cn(
                    "flex justify-between items-center p-2 rounded-lg transition-all",
                    isLowest ? "bg-price-lowest/10 text-price-lowest dark:bg-price-lowest/20" : 
                    isHighest ? "bg-price-highest/10 text-price-highest dark:bg-price-highest/20" : 
                    "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: store?.color }}
                    />
                    <span className="font-medium">{store?.name}</span>
                    {isLowest && compareStores && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full dark:bg-green-900/40 dark:text-green-400">
                        Best Price
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-medium">
                    {price.currency}{formatPrice(price.price)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {sortedPrices.map((price) => {
            const store = getStore(price.storeId);
            const isLowest = price.price === lowestPrice.price;
            const isHighest = price.price === highestPrice.price;
            
            return (
              <div 
                key={price.storeId}
                className={cn(
                  "text-xs px-2 py-1 rounded flex items-center gap-1.5 transition-all",
                  isLowest ? "bg-price-lowest/10 text-price-lowest dark:bg-price-lowest/20" : 
                  isHighest ? "bg-price-highest/10 text-price-highest dark:bg-price-highest/20" : 
                  "bg-muted/50"
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: store?.color }}
                />
                <span className="font-medium truncate max-w-[5rem]">{store?.name}</span>
                <span className="font-mono">
                  {price.currency}{formatPrice(price.price)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
