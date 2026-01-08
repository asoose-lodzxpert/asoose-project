import * as ImagePicker from "expo-image-picker";

export const pickMenuImage = async (): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
};
