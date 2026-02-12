import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  DimensionValue,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useToast } from "@/components/ui/ThemedToast";
import { useCart } from "@/context/CartContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchProductById,
  ProductDetails,
} from "@/services/marketplace.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  /* -------- Theme Colors -------- */
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

  /* -------- State -------- */
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<number | null>(null);

  const {
    items: cartItems,
    addItem,
    removeItem,
    increaseQty,
    decreaseQty,
  } = useCart();
  const showToast = useToast();

  // Check if product is in cart and get its quantity
  const cartItem = product
    ? cartItems.find((item) => item.id === product.id)
    : null;
  const cartQuantity = cartItem ? cartItem.qty : 0;

  /* -------- Data Loader with Auto-Retry -------- */
  const loadProduct = useCallback(
    async (attempt = 0) => {
      if (!id || typeof id !== "string") {
        setProduct(null);
        setError("Product not found");
        setLoading(false);
        return;
      }

      if (attempt === 0) {
        setLoading(true);
        setError(null);
        setRetryCount(0);
      }

      try {
        const data = await fetchProductById(id);
        setProduct(data);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        const errorMessage = (e as Error)?.message || "Failed to load product";
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch") ||
          errorMessage.toLowerCase().includes("connection");

        // Retry up to 3 times with exponential backoff for network errors
        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            loadProduct(attempt + 1);
          }, delay);
        } else {
          // Only show error and stop loading after all retries exhausted
          setProduct(null);
          setError(errorMessage);
          setLoading(false);
          setRefreshing(false);
          setRetryCount(0);
        }
      }
    },
    [id],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProduct();
  }, [loadProduct]);

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addItem({
        id: product.id,
        name: product.name,
        image: product.images?.[0],
        price: product.price,
        qty: quantity,
        vendorId: product.store.id,
        description: product.description || "",
        available: product.available,
      });

      showToast({
        variant: "success",
        message: `Added ${quantity} item(s) to cart`,
      });

      // router.back();
    } catch (e) {
      showToast({
        variant: "error",
        message: "Could not add to cart. Please try again.",
      });
    }
  };

  const handleRemoveFromCart = async () => {
    if (!product) return;
    try {
      await removeItem(product.id);
      showToast({
        variant: "success",
        message: `Removed from cart`,
      });
    } catch (e) {
      showToast({
        variant: "error",
        message: "Could not remove from cart. Please try again.",
      });
    }
  };

  const handleIncrement = async () => {
    if (!product) return;
    await increaseQty(product.id);
  };

  const handleDecrement = async () => {
    if (!product) return;
    await decreaseQty(product.id);
  };

  /* ---------------- Skeleton Components ---------------- */
  const SkeletonLine = ({
    width = "100%",
    height = 14,
    radius = 8,
  }: {
    width?: DimensionValue;
    height?: number;
    radius?: number;
  }) => {
    const progress = useSharedValue(-SCREEN_WIDTH);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: progress.value }],
    }));

    useEffect(() => {
      progress.value = withRepeat(
        withTiming(SCREEN_WIDTH, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
    }, []);

    return (
      <View
        style={{
          width,
          height,
          borderRadius: radius,
          backgroundColor: surfaceSubtle,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <Animated.View
          style={[
            {
              width: "40%",
              height: "100%",
              backgroundColor: border,
              opacity: 0.4,
            },
            animatedStyle,
          ]}
        />
      </View>
    );
  };

  /* ---------------- UI Components ---------------- */
  const renderImageGallery = () => {
    if (!product?.images?.length) {
      return (
        <View
          style={[styles.imagePlaceholder, { backgroundColor: surfaceSubtle }]}
        >
          <IconSymbol name="basket.fill" size={64} color={border} />
        </View>
      );
    }

    return (
      <Image
        source={{ uri: product.images[0] }}
        style={styles.productImage}
        resizeMode="cover"
      />
    );
  };

  const renderQuantitySelector = () => (
    <View style={styles.quantitySelector}>
      <ThemedText style={[styles.quantityLabel, { color: textSecondary }]}>
        Quantity
      </ThemedText>
      <View style={styles.quantityControls}>
        <Pressable
          style={[styles.quantityButton, { borderColor: border }]}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <IconSymbol name="minus" size={20} color={textColor} />
        </Pressable>
        <ThemedText style={[styles.quantityValue, { color: textColor }]}>
          {quantity}
        </ThemedText>
        <Pressable
          style={[styles.quantityButton, { borderColor: border }]}
          onPress={() => setQuantity(quantity + 1)}
        >
          <IconSymbol name="plus" size={20} color={textColor} />
        </Pressable>
      </View>
    </View>
  );

  const renderProductInfo = () => {
    if (!product) return null;

    return (
      <View style={styles.infoSection}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.productName, { color: textColor }]}>
              {product.name}
            </ThemedText>
            {product.category?.name && (
              <View style={styles.categoryBadge}>
                <IconSymbol name="tag.fill" size={14} color={brandPrimary} />
                <ThemedText
                  style={[styles.categoryText, { color: brandPrimary }]}
                >
                  {product.category.name}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.productPrice, { color: brandPrimary }]}>
            ₦{product.price?.toFixed(2) || "0.00"}
          </ThemedText>
        </View>

        {product.description && (
          <View style={styles.descriptionSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Description
            </ThemedText>
            <ThemedText style={[styles.description, { color: textSecondary }]}>
              {product.description}
            </ThemedText>
          </View>
        )}

        {renderQuantitySelector()}
      </View>
    );
  };

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.errorContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={brandPrimary}
        />
      }
    >
      <IconSymbol name="alert-circle" size={48} color={brandPrimary} />
      <ThemedText style={[styles.errorTitle, { color: textColor }]}>
        Oops!
      </ThemedText>
      <ThemedText style={[styles.errorText, { color: textSecondary }]}>
        {error || "Product not available"}
      </ThemedText>

      <Pressable
        style={[styles.retryButton, { borderColor: brandPrimary }]}
        onPress={() => router.back()}
      >
        <ThemedText style={[styles.retryButtonText, { color: brandPrimary }]}>
          Go Back
        </ThemedText>
      </Pressable>
    </ScrollView>
  );

  const renderContent = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={brandPrimary}
        />
      }
    >
      {renderImageGallery()}
      <View style={[styles.contentContainer, { backgroundColor: surface }]}>
        {renderProductInfo()}
      </View>
    </ScrollView>
  );

  const renderSkeletonContent = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View
        style={[styles.imagePlaceholder, { backgroundColor: surfaceSubtle }]}
      />
      <View style={styles.contentContainer}>
        <View style={styles.infoSection}>
          <SkeletonLine width="70%" height={28} />
          <SkeletonLine width="30%" height={20} />
          <SkeletonLine width="100%" height={16} />
          <SkeletonLine width="90%" height={16} />
          <SkeletonLine width="95%" height={16} />
          <SkeletonLine width="40%" height={40} />
        </View>
      </View>
    </ScrollView>
  );

  return (
    <ThemedView style={[styles.mainContainer, { backgroundColor: surface }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: border, backgroundColor: surface },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Product Details
          </ThemedText>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Body */}
      {loading
        ? renderSkeletonContent()
        : error || !product
          ? renderEmptyState()
          : renderContent()}

      {/* Add to Cart Button */}
      {!loading && product && (
        <View
          style={[
            styles.footer,
            { backgroundColor: surfaceCard, borderTopColor: border },
          ]}
        >
          <View style={styles.totalSection}>
            <ThemedText style={[styles.totalLabel, { color: textSecondary }]}>
              Total
            </ThemedText>
            <ThemedText style={[styles.totalPrice, { color: brandPrimary }]}>
              ₦{((product.price || 0) * (cartQuantity || quantity)).toFixed(2)}
            </ThemedText>
          </View>
          {/* Add to Cart / Remove from Cart & Quantity Controls */}
          {cartItem ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Pressable
                style={[
                  styles.addToCartButton,
                  {
                    flex: 1,
                    backgroundColor: "#FFF",
                    borderWidth: 1,
                    borderColor: brandPrimary,
                  },
                ]}
                onPress={handleRemoveFromCart}
              >
                <IconSymbol name="trash" size={20} color={brandPrimary} />
                <ThemedText
                  style={[styles.addToCartText, { color: brandPrimary }]}
                >
                  Remove from Cart
                </ThemedText>
              </Pressable>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 0,
                  backgroundColor: surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Pressable
                  style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                  onPress={handleDecrement}
                >
                  <IconSymbol name="minus" size={18} color={textColor} />
                </Pressable>
                <ThemedText
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    minWidth: 32,
                    textAlign: "center",
                    color: textColor,
                  }}
                >
                  {cartQuantity}
                </ThemedText>
                <Pressable
                  style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                  onPress={handleIncrement}
                >
                  <IconSymbol name="plus" size={18} color={textColor} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[
                styles.addToCartButton,
                { backgroundColor: brandPrimary },
              ]}
              onPress={handleAddToCart}
            >
              <IconSymbol name="cart" size={20} color="#FFF" />
              <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </ThemedView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  mainContainer: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, borderRadius: 12, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "600" },
  headerSpacer: { width: 32 },

  scrollView: { flex: 1 },

  productImage: {
    width: "100%",
    height: 300,
  },
  imagePlaceholder: {
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },

  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
  },

  infoSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  productName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 32,
  },

  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },

  productPrice: {
    fontSize: 28,
    fontWeight: "800",
  },

  descriptionSection: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
  },

  quantitySelector: {
    marginTop: 8,
  },

  quantityLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },

  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  quantityValue: {
    fontSize: 20,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },

  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
  },

  totalPrice: {
    fontSize: 24,
    fontWeight: "800",
  },

  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },

  addToCartText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  errorContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  errorTitle: { fontSize: 24, fontWeight: "700", marginTop: 8 },
  errorText: { fontSize: 16, textAlign: "center", marginBottom: 24 },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryButtonText: { fontSize: 16, fontWeight: "600" },
});
