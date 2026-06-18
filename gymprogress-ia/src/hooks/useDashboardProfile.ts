// src/hooks/useDashboardProfile.ts

import { useCallback, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProfileData } from "@/components/modals/ProfileModal";

/**
 * Controla os dados de perfil do usuário dentro do dashboard.
 *
 * Responsável por:
 * - armazenar os dados do perfil;
 * - controlar os modais de perfil e boas-vindas;
 * - salvar as informações no Firebase;
 * - restaurar dados caso o usuário feche o modal sem salvar.
 */
export function useDashboardProfile() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    age: "",
    gender: "",
    weight: "",
    height: "",
    goal: "",
    limitations: "",
  });

  const [savedProfile, setSavedProfile] = useState<ProfileData>({
    age: "",
    gender: "",
    weight: "",
    height: "",
    goal: "",
    limitations: "",
  });

  /**
   * Carrega o perfil vindo do Firebase.
   *
   * Também salva uma cópia em savedProfile para permitir
   * descartar alterações caso o usuário feche o modal.
   */
  const loadProfile = useCallback(function loadProfile(
    data: ProfileData,
    profileCompleted?: boolean,
  ) {
    setProfile(data);
    setSavedProfile(data);
    setShowWelcomeModal(!profileCompleted);
  }, []);

  /**
   * Salva o perfil atual do usuário no Firebase.
   *
   * Após salvar, atualiza a cópia salva e fecha os modais.
   */
  const handleSaveProfile = useCallback(
    async function handleSaveProfile(userId: string) {
      if (!userId) return;

      await setDoc(
        doc(db, "users", userId),
        {
          ...profile,
          profileCompleted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setSavedProfile(profile);
      setShowWelcomeModal(false);
      setShowProfileModal(false);
    },
    [profile],
  );

  /**
   * Fecha o modal de perfil e restaura os dados salvos anteriormente.
   *
   * Isso evita manter alterações que o usuário não salvou.
   */
  const handleCloseProfileModal = useCallback(
    function handleCloseProfileModal() {
      setProfile(savedProfile);
      setShowProfileModal(false);
    },
    [savedProfile],
  );

  return {
    profile,
    setProfile,
    showWelcomeModal,
    setShowWelcomeModal,
    showProfileModal,
    setShowProfileModal,
    loadProfile,
    handleSaveProfile,
    handleCloseProfileModal,
  };
}
