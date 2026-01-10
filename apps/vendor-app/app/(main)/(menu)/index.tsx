import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";

import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuTabs } from "@/components/menu/MenuTabs";
import { MenuEmptyState } from "@/components/menu/MenuEmptyState";
import { MenuFilters } from "@/components/menu/MenuFilters";

import { Category, MenuItem } from "@/types/menu";
import { CategoryRow } from "@/components/menu/CategoryRow";
import { MenuItemCard } from "@/components/menu/MenuItemCard";

import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

import { AddMenuItemModal } from "@/components/menu/AddMenuItemModal";
import { AddCategoryModal } from "@/components/menu/AddCategoryModal";

import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStock,
  Product,
} from "@/services/products.service";
import { useFocusEffect } from "expo-router";

export default function MenuScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* -------------------- Modals -------------------- */
  const [menuItemModalVisible, setMenuItemModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | undefined>(undefined);

  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);

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
        text1: error.message || "Failed to load menu data",
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

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

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

  const handleSaveMenuItem = async (
    item: Partial<MenuItem> & {
      name: string;
      price: number;
      categoryId: string;
    }
  ) => {
    if (!user?.storeId) return;

    try {
      if (itemToEdit) {
        // Update existing
        const updated = await updateProduct(itemToEdit.id, {
          name: item.name,
          price: item.price,
          categoryId: item.categoryId,
          stock: item.stock,
          image: item.image || undefined,
        });

        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );

        Toast.show({
          type: "success",
          text1: "Product updated",
        });
      } else {
        // Create new
        const created = await createProduct({
          storeId: user.storeId,
          name: item.name,
          price: item.price,
          categoryId: item.categoryId,
          stock: item.stock || 0,
          image: item.image || undefined,
        });

        setItems((prev) => [created, ...prev]);

        Toast.show({
          type: "success",
          text1: "Product created",
        });
      }

      setMenuItemModalVisible(false);
      setItemToEdit(undefined);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to save product",
      });
    }
  };

  /* -------------------- Renderers -------------------- */
  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <MenuItemCard
      item={item}
      onToggleStock={() => handleToggleStock(item.id)}
      onEdit={() => {
        setItemToEdit(item);
        setMenuItemModalVisible(true);
      }}
      onDelete={() => setDeleteTarget(item)}
    />
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <CategoryRow
      name={item.name}
      onEdit={() => {}}
      onDelete={() => {
        // TODO: Add category deletion endpoint to backend
        Toast.show({
          type: "info",
          text1: "Category deletion",
          text2: "Feature coming soon",
        });
      }}
    />
  );

  if (loading) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={primary} />
        <ThemedText style={{ marginTop: 16 }}>Loading menu...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <MenuTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "items" && (
        <>
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
        </>
      )}

      {activeTab === "categories" && (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
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
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="plus"
        onPress={() => {
          if (activeTab === "items") {
            setItemToEdit(undefined);
            setMenuItemModalVisible(true);
          } else {
            setAddCategoryModalVisible(true);
          }
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        visible={!!deleteTarget}
        label="Do you want to delete this item?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        loading={deletingId !== null}
      />

      {/* Add/Edit Menu Item Modal */}
      <AddMenuItemModal
        visible={menuItemModalVisible}
        onClose={() => {
          setMenuItemModalVisible(false);
          setItemToEdit(undefined);
        }}
        onSave={handleSaveMenuItem}
        categories={categoryOptions}
        itemToEdit={itemToEdit}
      />

      <AddCategoryModal
        visible={addCategoryModalVisible}
        onClose={() => setAddCategoryModalVisible(false)}
        onSave={() => {
          setAddCategoryModalVisible(false);
          Toast.show({
            type: "info",
            text1: "Category creation",
            text2: "Feature coming soon",
          });
        }}
      />

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
});
