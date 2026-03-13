import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  DimensionValue,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Toast from "react-native-toast-message"; // Correct Import

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";

import { useCart } from "@/context/CartContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchProductById,
  ProductDetails,
} from "@/services/marketplace.service";
import {
  ModifierSelectionModal,
  type ModifierGroup,
} from "@/components/ModifierSelectionModal";

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
  const [showModifierModal, setShowModifierModal] = useState(false);
  const retryTimeoutRef = React.useRef<number | null>(null);

  const {
    items: cartItems,
    addItem,
    removeItem,
    increaseQty,
    decreaseQty,
  } = useCart();

  const cartItem = product
    ? cartItems.find((item) => item.id === product.id)
    : null;
  const cartQuantity = cartItem ? cartItem.qty : 0;

  /* -------- Data Loader -------- */
  const loadProduct = useCallback(
    async (attempt = 0) => {
      if (!id || typeof id !== "string") {
        setProduct(null);
        setError("Product not found");
        setLoading(false);
        return;
      }

      if (attempt === 0) setLoading(true);

      try {
        const data = await fetchProductById(id);
        setProduct(data);
        setError(null);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        const errorMessage = (e as Error)?.message || "Failed to load product";
        const isNetworkError = errorMessage.toLowerCase().includes("network");

        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          retryTimeoutRef.current = setTimeout(() => {
            loadProduct(attempt + 1);
          }, delay);
        } else {
          setProduct(null);
          setError(errorMessage);
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    loadProduct();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [loadProduct]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProduct();
  }, [loadProduct]);

  const handleAddToCart = () => {
    if (!product) return;
    // If the product has modifier groups, show the selection modal instead
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      setShowModifierModal(true);
      return;
    }
    handleDirectAddToCart();
  };

  const handleDirectAddToCart = async () => {
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

      Toast.show({
        type: "success",
        text1: "Added to cart",
        text2: `${quantity} item(s) of ${product.name} added.`,
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not add to cart. Please try again.",
      });
    }
  };

  const handleModifierConfirm = async (selectedGroups: {
    [groupId: string]: string[];
  }) => {
    if (!product) return;
    try {
      const modifierGroups = (product.modifierGroups || []).map((group) => {
        const selectedModifierIds = selectedGroups[group.id] || [];
        const selectedModifiers = group.modifiers
          .filter((m) => selectedModifierIds.includes(m.id))
          .map((m) => ({ id: m.id, name: m.name, price: m.price }));
        return { id: group.id, name: group.name, selectedModifiers };
      });

      await addItem({
        id: product.id,
        name: product.name,
        image: product.images?.[0],
        price: product.price,
        qty: quantity,
        vendorId: product.store.id,
        description: product.description || "",
        available: product.available,
        modifierGroups,
      });

      Toast.show({
        type: "success",
        text1: "Added to cart",
        text2: `${product.name} added with your selections.`,
      });
      setShowModifierModal(false);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not add to cart. Please try again.",
      });
    }
  };

  const handleRemoveFromCart = async () => {
    if (!product) return;
    try {
      await removeItem(product.id);
      Toast.show({
        type: "success",
        text1: "Removed",
        text2: "Item removed from your cart",
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not remove item.",
      });
    }
  };

  /* ---------------- Skeleton Component ---------------- */
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

  /* ---------------- UI Renderers ---------------- */
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
            ₦{product.price?.toFixed(2)}
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

        {/* Only show local quantity selector when item is not yet in cart.
            When the item IS in cart, the footer stepper is the sole control. */}
        {!cartItem && (
          <View style={styles.quantitySelector}>
            <ThemedText
              style={[styles.quantityLabel, { color: textSecondary }]}
            >
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
        )}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.mainContainer, { backgroundColor: surface }]}>
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
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: surfaceSubtle },
            ]}
          />
          <View style={styles.contentContainer}>
            <View style={styles.infoSection}>
              <SkeletonLine width="70%" height={28} />
              <SkeletonLine width="100%" height={60} />
            </View>
          </View>
        </ScrollView>
      ) : error || !product ? (
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
          <IconSymbol
            name="exclamationmark.triangle"
            size={48}
            color={brandPrimary}
          />
          <ThemedText style={styles.errorTitle}>Product Unavailable</ThemedText>
          <ThemedText style={styles.errorText}>
            {error || "This item couldn't be loaded."}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { borderColor: brandPrimary }]}
            onPress={() => router.back()}
          >
            <ThemedText style={{ color: brandPrimary }}>Go Back</ThemedText>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandPrimary}
            />
          }
        >
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: surfaceSubtle },
              ]}
            >
              <IconSymbol name="basket.fill" size={64} color={border} />
            </View>
          )}
          <View style={[styles.contentContainer, { backgroundColor: surface }]}>
            {renderProductInfo()}
          </View>
        </ScrollView>
      )}

      {!loading && product && (
        <View
          style={[
            styles.footer,
            { backgroundColor: surfaceCard, borderTopColor: border },
          ]}
        >
          <View style={styles.totalSection}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={[styles.totalPrice, { color: brandPrimary }]}>
              ₦{((product.price || 0) * (cartQuantity || quantity)).toFixed(2)}
            </ThemedText>
          </View>

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
                <ThemedText style={{ color: brandPrimary, fontWeight: "700" }}>
                  Remove
                </ThemedText>
              </Pressable>
              <View style={[styles.cartStepper, { borderColor: border }]}>
                <Pressable
                  onPress={() => decreaseQty(product.id)}
                  style={styles.stepperBtn}
                >
                  <IconSymbol name="minus" size={18} color={textColor} />
                </Pressable>
                <ThemedText style={styles.stepperValue}>
                  {cartQuantity}
                </ThemedText>
                <Pressable
                  onPress={() => increaseQty(product.id)}
                  style={styles.stepperBtn}
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
      <Toast />
      {product && (
        <ModifierSelectionModal
          visible={showModifierModal}
          modifierGroups={product.modifierGroups as unknown as ModifierGroup[]}
          basePrice={product.price}
          quantity={quantity}
          productName={product.name}
          onConfirm={handleModifierConfirm}
          onCancel={() => setShowModifierModal(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  headerTitleContainer: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  productImage: { width: "100%", height: 300 },
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
  infoSection: { paddingHorizontal: 24, paddingBottom: 24 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  productName: { fontSize: 22, fontWeight: "700", flex: 1 },
  productPrice: { fontSize: 24, fontWeight: "800", marginLeft: 12 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginTop: 4,
  },
  categoryText: { fontSize: 12, fontWeight: "600" },
  descriptionSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22 },
  quantitySelector: { marginTop: 8 },
  quantityLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 30,
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
  totalLabel: { fontSize: 14, fontWeight: "600", opacity: 0.6 },
  totalPrice: { fontSize: 22, fontWeight: "800" },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  addToCartText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cartStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  stepperBtn: { padding: 12 },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  errorContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: { fontSize: 20, fontWeight: "700" },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.6,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
});
