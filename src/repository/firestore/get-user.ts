import type {
  UserAttributeType,
  UserFireStoreType,
} from "./models/user.type.js";

export const getUserByAttributeFactory = (firestoreClient: FirebaseFirestore.Firestore) => {
  return async (
    userAttribute: UserAttributeType,
    value: string,
  ): Promise<UserFireStoreType | undefined> => {
    const snapshot = await firestoreClient.collection("users").where(userAttribute, "==", value).get();
    if (
      snapshot.empty ||
      !snapshot ||
      !snapshot.docs[0] ||
      !snapshot.docs[0].data()
    ) {
      return undefined;
    }
    return snapshot.docs[0].data() as UserFireStoreType;
  };
};
