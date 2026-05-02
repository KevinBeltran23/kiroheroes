import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { MainTabParamList } from './types';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import NewSessionScreen from '../screens/main/NewSessionScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Raised centre + button
function AddButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const { proportionalSize } = useResponsiveStyles();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.addButton,
        {
          backgroundColor: colors.primary,
          width: proportionalSize(60),
          height: proportionalSize(60),
          borderRadius: proportionalSize(30),
          bottom: proportionalSize(14),
          shadowColor: colors.primary,
        },
      ]}
      accessibilityLabel="New analysis"
      accessibilityRole="button"
    >
      <Icon name="plus" size={proportionalSize(30)} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});

export function MainNavigator() {
  const colors = useColors();
  const { scaleHeight, scaleFont, proportionalSize, isMediumScreen, isLargeScreen } =
    useResponsiveStyles();
  const isLarge = isMediumScreen || isLargeScreen;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          paddingBottom: isLarge ? scaleHeight(25) : scaleHeight(10),
          height: scaleHeight(75),
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          fontSize: scaleFont(12),
          marginBottom: isLarge ? scaleHeight(-3) : scaleHeight(5),
        },
      }}
    >
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NewSessionTab"
        component={NewSessionScreen}
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: props => (
            <AddButton onPress={() => props.onPress?.()} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
