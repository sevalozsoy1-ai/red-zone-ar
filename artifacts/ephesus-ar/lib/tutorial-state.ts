import AsyncStorage from "@react-native-async-storage/async-storage";

const TUTORIAL_SEEN_KEY = "@red_zone_ar_target_tutorial_seen";

export async function hasSeenTargetTutorial(storage = AsyncStorage): Promise<boolean> {
  try {
    const value = await storage.getItem(TUTORIAL_SEEN_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setTargetTutorialSeen(storage = AsyncStorage): Promise<void> {
  try {
    await storage.setItem(TUTORIAL_SEEN_KEY, "true");
  } catch {
    // Ignore async storage errors
  }
}

export async function resetTargetTutorialSeen(storage = AsyncStorage): Promise<void> {
  try {
    await storage.removeItem(TUTORIAL_SEEN_KEY);
  } catch {
    // Ignore async storage errors
  }
}
