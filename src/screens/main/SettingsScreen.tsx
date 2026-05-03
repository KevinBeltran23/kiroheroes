import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import { User } from '../../types/user';

const skillLevels: Array<NonNullable<User['skillLevel']>> = [
  'beginner',
  'intermediate',
  'advanced',
];
const handednessOptions: Array<NonNullable<User['handedness']>> = [
  'right',
  'left',
  'ambidextrous',
];

function ProfileSection({
  user,
  onUpdateUser,
}: {
  user: User | null;
  onUpdateUser: (data: Partial<User>) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [skillLevel, setSkillLevel] = useState<string>(
    user?.skillLevel || 'beginner',
  );
  const [handedness, setHandedness] = useState<string>(
    user?.handedness || 'right',
  );
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setSkillLevel(user?.skillLevel || 'beginner');
    setHandedness(user?.handedness || 'right');
  }, [user]);

  const handleUpdate = async () => {
    try {
      const normalizedSkillLevel = skillLevels.includes(
        skillLevel as NonNullable<User['skillLevel']>,
      )
        ? (skillLevel as User['skillLevel'])
        : 'beginner';
      const normalizedHandedness = handednessOptions.includes(
        handedness as NonNullable<User['handedness']>,
      )
        ? (handedness as User['handedness'])
        : 'right';
      await onUpdateUser({
        displayName,
        skillLevel: normalizedSkillLevel,
        handedness: normalizedHandedness,
      });
      setIsEditing(false);
      Alert.alert('Profile saved', 'Your drumming profile was updated.');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const s = StyleSheet.create({
    section: {
      alignItems: 'center',
      marginBottom: scaleHeight(26),
    },
    avatar: {
      width: scaleWidth(86),
      height: scaleWidth(86),
      borderRadius: proportionalSize(43),
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.primary,
      borderWidth: proportionalSize(1),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: scaleHeight(14),
    },
    avatarText: {
      color: colors.primary,
      fontSize: scaleFont(34),
      fontWeight: '800',
    },
    name: {
      color: colors.textPrimary,
      fontSize: scaleFont(21),
      fontWeight: '800',
    },
    email: {
      color: colors.textSecondary,
      fontSize: scaleFont(14),
      marginTop: scaleHeight(4),
    },
    input: {
      width: '100%',
      backgroundColor: colors.backgroundSecondary,
      color: colors.textPrimary,
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
      fontSize: scaleFont(15),
      marginBottom: scaleHeight(10),
    },
    row: {
      flexDirection: 'row',
      gap: scaleWidth(10),
      marginTop: scaleHeight(8),
    },
    button: { flex: 1 },
    editButton: { marginTop: scaleHeight(16) },
  });

  return (
    <View style={s.section}>
      <View style={s.avatar}>
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={s.avatarText}>
            {user?.displayName?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              '?'}
          </Text>
        )}
      </View>
      {isEditing ? (
        <View style={{ width: '100%' }}>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.textTertiary}
            style={s.input}
          />
          <TextInput
            value={skillLevel}
            onChangeText={text => setSkillLevel(text.toLowerCase())}
            placeholder="Skill level: beginner, intermediate, advanced"
            placeholderTextColor={colors.textTertiary}
            style={s.input}
          />
          <TextInput
            value={handedness}
            onChangeText={text => setHandedness(text.toLowerCase())}
            placeholder="Handedness: right, left, ambidextrous"
            placeholderTextColor={colors.textTertiary}
            style={s.input}
          />
          <View style={s.row}>
            <Button label="Save" onPress={handleUpdate} style={s.button} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setIsEditing(false)}
              style={s.button}
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={s.name}>{user?.displayName || 'Drummer'}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <Text style={s.email}>
            {user?.skillLevel || 'beginner'} - {user?.handedness || 'right'}{' '}
            handed
          </Text>
          <Button
            label="Edit Profile"
            onPress={() => setIsEditing(true)}
            style={s.editButton}
          />
        </>
      )}
    </View>
  );
}

function SettingsScreen() {
  const { user, signOut, updateUser, loading } = useAuth();
  const colors = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: proportionalSize(20),
      paddingTop: scaleHeight(56),
      paddingBottom: scaleHeight(80),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
      marginBottom: scaleHeight(20),
    },
    row: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
      borderRadius: proportionalSize(8),
      borderWidth: proportionalSize(1),
      paddingVertical: scaleHeight(15),
      paddingHorizontal: proportionalSize(13),
    },
    rowText: { color: colors.textPrimary, fontSize: scaleFont(16) },
    signOut: { marginTop: scaleHeight(28) },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Settings</Text>
      <ProfileSection user={user} onUpdateUser={updateUser} />
      {!!user && (
        <>
          <View style={s.row}>
            <Text style={s.rowText}>Project data syncs with your account.</Text>
          </View>
        </>
      )}
      <Button
        label="Sign Out"
        variant="danger"
        onPress={handleSignOut}
        style={s.signOut}
      />
    </ScrollView>
  );
}

export default SettingsScreen;
