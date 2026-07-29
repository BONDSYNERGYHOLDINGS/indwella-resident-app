import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppSafeAreaViewProps {
    children: React.ReactNode
    style?: ViewStyle;
}

const AppSafeAreaView: React.FC<AppSafeAreaViewProps> = ({children, style}) => {
  return (
    <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>
  )
}

export default AppSafeAreaView

const styles = StyleSheet.create({
  
    container: {
        flex: 1,
     
    }
})