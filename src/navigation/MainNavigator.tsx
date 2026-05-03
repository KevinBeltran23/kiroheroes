import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { MainTabParamList } from './types';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import HomeScreen from '../screens/main/HomeScreen';
import NewSessionScreen from '../screens/main/NewSessionScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
type IconName = React.ComponentProps<typeof Icon>['name'];

const TabBarIcon = ({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  size: number;
}) => <Icon name={name} size={size} color={color} />;

export function MainNavigator() {
  const colors = useColors();
  const { scaleHeight, scaleFont, isMediumScreen, isLargeScreen } =
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
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: props => <TabBarIcon name="home" {...props} />,
        }}
      />
      <Tab.Screen
        name="NewSessionTab"
        component={NewSessionScreen}
        options={{
          title: 'Analyze',
          tabBarIcon: props => <TabBarIcon name="plus-circle" {...props} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: props => <TabBarIcon name="cog" {...props} />,
        }}
      />
    </Tab.Navigator>
  );
}
