// src/hooks/useDashboardProfile.ts

import { useCallback, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProfileData } from "@/components/modals/ProfileModal";

export function useDashboardProfile() {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const emptyProfile: ProfileData = {
    birthDate: "",
    gender: "",
    weight: "",
    height: "",
    bmi: "",
    bmiClassification: "",
    experienceLevel: "",
    goal: "",
    customGoal: "",
    hasLimitations: "",
    limitations: "",
  };

  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<ProfileData>(emptyProfile);

  function calculateBmi(weight: string, height: string) {
    const weightNumber = Number(weight.replace(",", "."));
    const heightNumber = Number(height.replace(",", "."));

    if (!weightNumber || !heightNumber) {
      return {
        bmi: "",
        bmiClassification: "",
      };
    }

    const heightInMeters = heightNumber > 3 ? heightNumber / 100 : heightNumber;
    const bmiValue = weightNumber / (heightInMeters * heightInMeters);

    let bmiClassification = "";

    if (bmiValue < 18.5) {
      bmiClassification = "Magreza";
    } else if (bmiValue < 25) {
      bmiClassification = "Normal";
    } else if (bmiValue < 30) {
      bmiClassification = "Sobrepeso";
    } else if (bmiValue < 35) {
      bmiClassification = "Obesidade grau I";
    } else if (bmiValue < 40) {
      bmiClassification = "Obesidade grau II";
    } else {
      bmiClassification = "Obesidade grau III";
    }

    return {
      bmi: Number(bmiValue.toFixed(1)),
      bmiClassification,
    };
  }

  const loadProfile = useCallback(function loadProfile(
    data: ProfileData,
    profileCompleted?: boolean,
    privacyAccepted?: boolean,
  ) {
    const loadedProfile: ProfileData = {
      birthDate: data.birthDate ?? "",
      gender: data.gender ?? "",
      weight: data.weight ? String(data.weight) : "",
      height: data.height ? String(data.height) : "",
      bmi: data.bmi ? String(data.bmi) : "",
      bmiClassification: data.bmiClassification ?? "",
      experienceLevel: data.experienceLevel ?? "",
      goal: data.goal ?? "",
      customGoal: data.customGoal ?? "",
      hasLimitations: data.hasLimitations ?? "",
      limitations: data.limitations ?? "",
    };

    setProfile(loadedProfile);
    setSavedProfile(loadedProfile);

    if (!privacyAccepted) {
      setShowPrivacyModal(true);
      setShowWelcomeModal(false);
      return;
    }

    setShowPrivacyModal(false);
    setShowWelcomeModal(!profileCompleted);
  }, []);

  const handleAcceptPrivacy = useCallback(async function handleAcceptPrivacy(
    userId: string,
  ) {
    if (!userId) return;

    await setDoc(
      doc(db, "users", userId),
      {
        privacyAccepted: true,
        privacyAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setShowPrivacyModal(false);
    setShowWelcomeModal(true);
  }, []);

  const handleSaveProfile = useCallback(
    async function handleSaveProfile(userId: string) {
      if (!userId) return;

      const calculatedBmi = calculateBmi(profile.weight, profile.height);

      const profileToSave = {
        birthDate: profile.birthDate,
        gender: profile.gender,
        weight: Number(profile.weight),
        height: Number(profile.height),
        bmi: calculatedBmi.bmi,
        bmiClassification: calculatedBmi.bmiClassification,
        experienceLevel: profile.experienceLevel,
        goal: profile.goal,
        customGoal: profile.goal === "outros" ? profile.customGoal : "",
        hasLimitations: profile.hasLimitations === "sim",
        limitations:
          profile.hasLimitations === "sim" ? profile.limitations : "",
        profileVersion: 2,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", userId), profileToSave, { merge: true });

      const normalizedProfile: ProfileData = {
        birthDate: profileToSave.birthDate,
        gender: profileToSave.gender,
        weight: String(profileToSave.weight),
        height: String(profileToSave.height),
        bmi: String(profileToSave.bmi),
        bmiClassification: profileToSave.bmiClassification,
        experienceLevel: profileToSave.experienceLevel,
        goal: profileToSave.goal,
        customGoal: profileToSave.customGoal,
        hasLimitations: profileToSave.hasLimitations ? "sim" : "nao",
        limitations: profileToSave.limitations,
      };

      setProfile(normalizedProfile);
      setSavedProfile(normalizedProfile);
      setShowWelcomeModal(false);
      setShowProfileModal(false);
    },
    [profile],
  );

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
    showPrivacyModal,
    setShowPrivacyModal,
    showWelcomeModal,
    setShowWelcomeModal,
    showProfileModal,
    setShowProfileModal,
    loadProfile,
    handleAcceptPrivacy,
    handleSaveProfile,
    handleCloseProfileModal,
  };
}
