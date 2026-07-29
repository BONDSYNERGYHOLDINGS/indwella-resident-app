import { Dimensions, Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'
const { width } = Dimensions.get('window')

export default function Recharge() {
  return (
    <View style={{    marginVertical: 0, justifyContent: 'center', alignItems: 'center'}}>
     <Image
        source={require('../assets/Recharge.png') }
        resizeMode='contain'
        style={{width, height: 200}} />
    </View>
  )
}

const styles = StyleSheet.create({})