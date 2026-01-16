import React, { useMemo, useState, useCallback } from "react";
import { StyleSheet, FlatList, RefreshControl, View } from "react-native";
import Toast from "react-native-toast-message";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";

import { MenuEmptyState } from "@/components/menu/MenuEmptyState";
import { MenuFilters } from "@/components/menu/MenuFilters";

import { Category, MenuItem } from "@/types/menu";
import { MenuItemCard } from "@/components/menu/MenuItemCard";

import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

import {
  fetchProducts,
  fetchCategories,
  deleteProduct,
  toggleProductStock,
} from "@/services/products.service";
import { useFocusEffect, useRouter } from "expo-router";

export default function MenuScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* -------------------- Load Data -------------------- */
  const loadData = async (isRefresh = false) => {
    if (!user?.storeId) {
      setLoading(false);
      Toast.show({
        type: "error",
        text1: "No store found",
        text2: "Please complete your store setup",
      });
      return;
    }

    try {
      if (!isRefresh) setLoading(true);

      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(user.storeId),
        fetchCategories(),
      ]);

      setItems(productsData);
      setCategories(categoriesData);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to load listings data",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.storeId])
  );

  /* -------------------- Computed -------------------- */
  const filteredItems = useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((i) => i.categoryId === activeCategory);
  }, [items, activeCategory]);

  const categoryOptions = useMemo(() => {
    const categoriesWithItems = categories.filter((c) =>
      items.some((item) => item.categoryId === c.id)
    );
    return categoriesWithItems.map((c) => ({ id: c.id, name: c.name }));
  }, [categories, items]);

  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => (counts[c.id] = 0));
    items.forEach((i) => {
      if (counts[i.categoryId] !== undefined) counts[i.categoryId] += 1;
    });
    return counts;
  }, [items, categories]);

  /* -------------------- Handlers -------------------- */
  const handleToggleStock = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    try {
      const updated = await toggleProductStock(id, item.status);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: updated.status } : i))
      );
      Toast.show({
        type: "success",
        text1: updated.status === "ACTIVE" ? "In stock" : "Out of stock",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to update stock",
      });
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      await deleteProduct(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      Toast.show({
        type: "success",
        text1: "Product deleted",
      });
      setDeleteTarget(null);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to delete product",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [user?.storeId]);

  /* -------------------- Renderers -------------------- */
  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <MenuItemCard
      item={item}
      onToggleStock={() => handleToggleStock(item.id)}
      onEdit={() => router.push(`/(main)/(menu)/add-item?id=${item.id}`)}
      onDelete={() => setDeleteTarget(item)}
    />
  );

  const borderColor = useThemeColor({}, "borderDefault");
  const background = useThemeColor({}, "surfaceCard");

  if (loading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View
            style={{
              width: 80,
              height: 28,
              backgroundColor: borderColor,
              borderRadius: 6,
              opacity: 0.3,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              width: 200,
              height: 16,
              backgroundColor: borderColor,
              borderRadius: 4,
              opacity: 0.3,
            }}
          />
        </View>

        {/* Filters skeleton */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <View
                key={i}
                style={{
                  width: 90,
                  height: 36,
                  backgroundColor: borderColor,
                  borderRadius: 18,
                  opacity: 0.3,
                }}
              />
            ))}
          </View>
        </View>

        {/* Listings skeleton */}
        <View style={{ paddingHorizontal: 16 }}>
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              style={{
                backgroundColor: background,
                borderRadius: 12,
                marginBottom: 12,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                {/* Image skeleton */}
                <View
                  style={{
                    width: 80,
                    height: 80,
                    backgroundColor: borderColor,
                    borderRadius: 8,
                    opacity: 0.3,
                  }}
                />

                {/* Content skeleton */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View
                    style={{
                      width: "70%",
                      height: 18,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                      marginBottom: 8,
                    }}
                  />
                  <View
                    style={{
                      width: "40%",
                      height: 14,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                      marginBottom: 8,
                    }}
                  />
                  <View
                    style={{
                      width: "50%",
                      height: 16,
                      backgroundColor: borderColor,
                      borderRadius: 4,
                      opacity: 0.3,
                    }}
                  />
                </View>

                {/* Switch skeleton */}
                <View
                  style={{
                    width: 50,
                    height: 30,
                    backgroundColor: borderColor,
                    borderRadius: 15,
                    opacity: 0.3,
                  }}
                />
              </View>

              {/* Actions skeleton */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View
                  style={{
                    flex: 1,
                    height: 36,
                    backgroundColor: borderColor,
                    borderRadius: 8,
                    opacity: 0.3,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: 36,
                    backgroundColor: borderColor,
                    borderRadius: 8,
                    opacity: 0.3,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Listings</ThemedText>
        <ThemedText type="caption" style={styles.caption}>
          Manage your products and inventory
        </ThemedText>
      </View>

      <MenuFilters
        categories={categoryOptions}
        active={activeCategory}
        onSelect={setActiveCategory}
        counts={categoryCounts}
      />
      <FlatList
        style={{ marginTop: 16 }}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primary}
          />
        }
        ListEmptyComponent={<MenuEmptyState />}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="plus"
        onPress={() => router.push("/(main)/(menu)/add-item")}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        visible={!!deleteTarget}
        label="Do you want to delete this item?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        loading={deletingId !== null}
      />

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  caption: {
    marginTop: 4,
    opacity: 0.6,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
});
