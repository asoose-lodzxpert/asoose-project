import React, { useMemo, useState, useCallback } from "react";
import { StyleSheet, FlatList, RefreshControl, Alert } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuTabs } from "@/components/menu/MenuTabs";
import { MenuEmptyState } from "@/components/menu/MenuEmptyState";
import { MenuFilters } from "@/components/menu/MenuFilters";

import { Category, MenuItem } from "@/types/menu";
import { CategoryRow } from "@/components/menu/CategoryRow";
import { MenuItemCard } from "@/components/menu/MenuItemCard";

import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { INITIAL_CATEGORIES, INITIAL_ITEMS } from "@/config/demo-menu";

import { AddMenuItemModal } from "@/components/menu/AddMenuItemModal";
import { AddCategoryModal } from "@/components/menu/AddCategoryModal";

export default function MenuScreen() {
  const primary = useThemeColor({}, "brandPrimary");

  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [items, setItems] = useState<MenuItem[]>(INITIAL_ITEMS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const [refreshingItems, setRefreshingItems] = useState(false);
  const [refreshingCategories, setRefreshingCategories] = useState(false);

  /* -------------------- Modals -------------------- */
  const [menuItemModalVisible, setMenuItemModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | undefined>(undefined);

  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  /* -------------------- Computed -------------------- */
  const filteredItems = useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => (counts[c.name] = 0));
    items.forEach((i) => {
      if (counts[i.category] !== undefined) counts[i.category] += 1;
    });
    return counts;
  }, [items, categories]);

  /* -------------------- Handlers -------------------- */
  const handleToggleStock = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, inStock: !i.inStock } : i))
    );
  };

  const handleDeleteItem = () => {
    if (!deleteTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleRefreshItems = useCallback(() => {
    setRefreshingItems(true);
    setTimeout(() => setRefreshingItems(false), 800);
  }, []);

  const handleRefreshCategories = useCallback(() => {
    setRefreshingCategories(true);
    setTimeout(() => setRefreshingCategories(false), 800);
  }, []);

  const handleSaveMenuItem = (item: MenuItem) => {
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      // update
      const updated = [...items];
      updated[existingIndex] = item;
      setItems(updated);
    } else {
      setItems((prev) => [...prev, item]);
    }
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Validation Error", "Category name is required");
      return;
    }
    const newCat: Category = {
      id: `mock-${Math.random().toString(36).substr(2, 9)}`,
      name: newCategoryName.trim(),
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCategoryName("");
    setAddCategoryModalVisible(false);
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
      onDelete={() =>
        setCategories((prev) => prev.filter((c) => c.id !== item.id))
      }
    />
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <MenuHeader />
      <MenuTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "items" && (
        <>
          <MenuFilters
            categories={categoryNames}
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
                refreshing={refreshingItems}
                onRefresh={handleRefreshItems}
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
              refreshing={refreshingCategories}
              onRefresh={handleRefreshCategories}
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
      />

      {/* Add/Edit Menu Item Modal */}
      <AddMenuItemModal
        visible={menuItemModalVisible}
        onClose={() => setMenuItemModalVisible(false)}
        onSave={handleSaveMenuItem}
        categories={categoryNames}
        itemToEdit={itemToEdit}
      />

      <AddCategoryModal
        visible={addCategoryModalVisible}
        onClose={() => setAddCategoryModalVisible(false)}
        onSave={handleSaveCategory}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
});
