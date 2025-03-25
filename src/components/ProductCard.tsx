import { useState } from "react";
import { Product } from "@/lib/types/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, ExternalLink, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { convertCRCtoUSD, formatCurrency } from "@/utils/currencyUtils";
import { useTranslation } from "@/context/TranslationContext";

interface ProductCardProps {
  product: Product;
  isInList?: boolean;
  onAddToList?: (productId: string) => void;
}

export const ProductCard = ({
  product,
  isInList = false,
  onAddToList
}: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { translateText, isTranslated } = useTranslation();

  // Debug log to check product data
  console.log('Product in ProductCard:', product);
  console.log('Image URL:', product.imageUrl);

  const handleAddToList = async () => {
    if (!onAddToList) return;
    
    setIsAdding(true);
    try {
      await onAddToList(product.id);
      toast({
        title: isTranslated ? "Added to list" : translateText("Añadido a la lista"),
        description: `${isTranslated ? translateText(product.name) : product.name} ${isTranslated ? "has been added to your grocery list" : "ha sido añadido a tu lista de compras"}.`,
      });
    } catch (error) {
      toast({
        title: isTranslated ? "Error" : translateText("Error"),
        description: isTranslated ? "Failed to add product to list. Please try again." : "No se pudo añadir el producto a la lista. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Add a function to display price comparison if available
  const showStorePriceComparison = () => {
    // Since our API data doesn't currently include a full set of comparable prices,
    // we'll just show a placeholder badge indicating that clicking Compare will
    // search for this product across stores and display a comparison
    
    return (
      <div className="absolute top-2 left-2 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-md">
        {isTranslated ? "Price Compare Available" : translateText("Comparar Precios Disponible")}
      </div>
    );
  };

  // Price display with translation
  const renderPrice = () => {
    if (!product.price) {
      return <span className="text-muted-foreground italic">
        {isTranslated ? "Price not available" : translateText("Precio no disponible")}
      </span>;
    }

    const usdPrice = convertCRCtoUSD(product.price);
    
    return (
      <div className="flex flex-col">
        <span className="flex items-center font-semibold">
          {formatCurrency(product.price, "CRC")}
          <span className="ml-2 text-sm text-muted-foreground">
            ({formatCurrency(usdPrice, "USD")})
          </span>
        </span>
        {product.pricePerUnit && (
          <span className="text-xs text-muted-foreground">
            {formatCurrency(product.pricePerUnit, "CRC")}/{translateText(product.unitType || "unidad")}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={isTranslated ? translateText(product.name) : product.name} 
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {isTranslated ? "No image" : translateText("Sin imagen")}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge 
            variant={product.store === 'MasxMenos' ? 'default' : 'secondary'} 
            className={cn(
              "font-semibold",
              product.store === 'MasxMenos' && "bg-green-600 hover:bg-green-700",
              product.store === 'MaxiPali' && "bg-yellow-500 hover:bg-yellow-600 text-black"
            )}
          >
            {isTranslated ? translateText(product.store) : product.store}
          </Badge>
        </div>
        
        {/* Store Comparison Badge */}
        {showStorePriceComparison()}
        
        {/* Source Badge */}
        {product.source && (
          <div className="absolute bottom-2 left-2 bg-primary/80 text-white text-xs px-2 py-1 rounded-md">
            {isTranslated ? translateText(product.source) : product.source}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 flex-1">
          <div>
            <h3 className="font-medium text-lg leading-tight line-clamp-2">{isTranslated ? translateText(product.name) : product.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {product.brand 
                  ? (isTranslated ? translateText(product.brand) : product.brand) 
                  : (isTranslated ? "Unknown brand" : translateText("Marca desconocida"))}
              </p>
              {product.ean && (
                <span className="text-xs text-muted-foreground">
                  EAN: {product.ean}
                </span>
              )}
            </div>
          </div>
          
          {onAddToList && (
            <Button
              size="icon"
              variant={isInList ? "secondary" : "default"}
              className={cn(
                "rounded-full flex-shrink-0",
                isInList && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
              onClick={handleAddToList}
              disabled={isAdding || isInList}
              aria-label={isTranslated ? (isInList ? "Added to list" : "Add to list") : translateText(isInList ? "Añadido a la lista" : "Añadir a la lista")}
            >
              {isInList ? (
                <Check className="h-4 w-4" />
              ) : isAdding ? (
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            {renderPrice()}
            {product.inStock !== undefined && (
              <Badge variant={product.inStock ? "outline" : "secondary"}>
                {product.inStock 
                  ? (isTranslated ? "In Stock" : translateText("En existencia")) 
                  : (isTranslated ? "Out of Stock" : translateText("Agotado"))}
              </Badge>
            )}
          </div>
          {product.category && (
            <p className="text-sm text-muted-foreground">{isTranslated ? translateText(product.category) : product.category}</p>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <Link
            to={`/product/${product.id}`}
            className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
          >
            {isTranslated ? "Compare" : translateText("Comparar")} <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
};
