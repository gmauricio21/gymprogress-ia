import { Injectable } from '@nestjs/common';
import { adminAuth, adminDb } from '../firebase-admin';

@Injectable()
export class AccountService {
  private async deleteCollection(
    collectionRef: FirebaseFirestore.CollectionReference,
    batchSize = 100,
  ) {
    const snapshot = await collectionRef.limit(batchSize).get();

    if (snapshot.empty) return;

    const batch = adminDb.batch();

    for (const doc of snapshot.docs) {
      await this.deleteDocumentSubcollections(doc.ref);
      batch.delete(doc.ref);
    }

    await batch.commit();

    if (snapshot.size >= batchSize) {
      await this.deleteCollection(collectionRef, batchSize);
    }
  }

  private async deleteDocumentSubcollections(
    docRef: FirebaseFirestore.DocumentReference,
  ) {
    const subcollections = await docRef.listCollections();

    for (const subcollection of subcollections) {
      await this.deleteCollection(subcollection);
    }
  }

  async deleteAccount(userId: string) {
    const userRef = adminDb.collection('users').doc(userId);

    await this.deleteDocumentSubcollections(userRef);
    await userRef.delete();

    await adminAuth.deleteUser(userId);

    return {
      success: true,
      message: 'Conta excluída com sucesso.',
    };
  }
}
