import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { RootStackParamList } from '../navigation/types'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'



// Type the navigation hook
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingScreen'>;
const OnboardingScreen = () => {
    const navigation = useNavigation<NavigationProp>();


    const handleRolePress = (role: 'resident' | 'admin' | 'security') => {
        navigation.navigate('introslider', { role });
    };

    return (
        <SafeAreaView style={styles.container} >
            <View style={styles.containerChild}>
                <Image style={styles.img} source={require("../assets/indwella_icon.png")} />
                <Text style={styles.headingText}>
                    Select a role
                </Text>

                <View style={{ 'paddingHorizontal': 20, 'gap': 20 }}>
                    <TouchableOpacity onPress={() => handleRolePress('resident')}  style={styles.onboardBtn}>
                        <View style={styles.textContainer}>
                            <Icon name='user' size={39}/>
                            <Text style={styles.btnText}>
                                Resident
                            </Text>
                        </View>
                        <Icon name='arrowR'  size={30}/>
                </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRolePress('admin')} style={styles.onboardBtn}>
                        <View style={styles.textContainer}>
                            <Icon name='checkP' size={39}/>
                            <Text style={styles.btnText}>
                                Facility Manager
                            </Text>
                        </View>
                        <Icon name='arrowR'  size={30}/>
                </TouchableOpacity> 
                    <TouchableOpacity onPress={() => handleRolePress('security')} style={styles.onboardBtn}>
                        <View style={styles.textContainer}>
                            <Icon name='security' size={39}/>
                            <Text style={styles.btnText}>
                                Security Agent
                            </Text>
                        </View>
                        <Icon name='arrowR'  size={30}/>
                </TouchableOpacity>
                </View>
          </View>
   </SafeAreaView>
  )
}

export default OnboardingScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        'backgroundColor': 'white',
        width: '100%',
        height: '100%'
    },
    containerChild: {
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headingText: {
        fontSize: 35,
        color: '#4C0096',
        fontWeight: '600',
        textAlign: 'center'
    },
    img: {
        width: 145,
        height: 145,
        marginBottom: 30
    },

    onboardBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 25,
        paddingVertical: 17,
        borderRadius: 6,
        backgroundColor: '#8506FF'

    },
    textContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 18,
    },
   
    btnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 25,
       
    }
})