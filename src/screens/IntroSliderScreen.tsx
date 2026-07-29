import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useNavigation, useRoute } from '@react-navigation/native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';


type Role = 'resident' | 'admin' | 'security';





type Slide = {
    key: string;
    title?: string;
    text: string;
    image: any;
    bgColor: string;
    arrow?: any;
}

const commonSlides: Slide[] = [
    {
        key: 'slide1',
      
        text: 'Effortlessly manage your estate, payments & more all in one place',
        image: require('../assets/slide1.png'),
        bgColor: '#F7EFFF',
        arrow: require('../assets/r1.png'),
    },
    {
        key: 'slide2',
       
        text: 'No more waiting at the gate, schedule & manage visitor arrivals with ease.',
        image: require('../assets/slide2.png'),
        bgColor: '#EEFFF9',
        arrow: require('../assets/r2.png'),
    },
    {
        key: 'slide3',
        text: 'Seamlessly manage your bills & utility with Indwella',
        image: require('../assets/slide3.png'),
        bgColor: '#E3F8FF',
        arrow: require('../assets/r3.png'),
    },
];

const roleFinalSlides: Record<Role, Slide> = {
    resident: {
        key: 'slide4',
        text: 'See an issue? Report it to your manager with Indwella',
        image: require('../assets/resImg.png'),
        bgColor: '#FFEFF1',
        arrow: require('../assets/r4.png'),
    },
    admin: {
        key: 'slide4',
        text: 'Effortlessly manage your estate, payments & more all in one place',
        image: require('../assets/adminImg.png'),
        bgColor: '#F7EFFF',
        arrow: require('../assets/r1.png'),
    },
    security: {
        key: 'slide4',
        text: 'Seamlessly manage your estate security with Indwella',
        image: require('../assets/secImg.png'),
        bgColor: '#E3F8FF',
        arrow: require('../assets/s1.png'),
    },
};



const IntroSliderScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const route = useRoute<any>();
    const role: Role = route.params?.role ?? 'resident';


    const slides = [...commonSlides, roleFinalSlides[role]];

    // const renderItem = ({ item }: { item: Slide }) => (
    const renderItem = ({ item, index }: any) => {
        const isLast = index === slides.length - 1;

        return (
            <View style={styles.slide}>
                {/* Image */}
                <View style={styles.imgContainer}>
                    <Image source={item.image} style={styles.image} />
                </View>
                {/* Content */}
                <View style={[styles.textContainer, { backgroundColor: item.bgColor }]}>
                    <Image source={item.arrow}  />
              
                    <Text style={styles.destext}>{item.text}</Text>
                    {isLast && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleDone}>
                            <Text style={styles.actionText}>Get Started</Text>
                        </TouchableOpacity>
                    )}
                </View>

              

               
            </View>
        );
    };
   
    // const handleDone = () => {
    //     if (role === 'resident') navigation.navigate('resident_auth');
    //     else if (role === 'admin') navigation.navigate('admin_auth');
    //     else if (role === 'security') navigation.navigate('security_auth');
    // };

    const handleDone = () => {
  if (role === 'resident') {
    navigation.navigate('resident_auth');
  } else if (role === 'admin') {
    navigation.navigate('admin_auth');
  } else if (role === 'security') {
    navigation.navigate('security_auth');
  }
};

    // const onDone = () => {
    //     navigation.navigate(`${role}login` as never); 
    // };

    const renderNextButton = () => (
        <View style={styles.buttonCircle}>
            <Text style={styles.buttonText}>Next</Text>
        </View>
    );

    const renderSkipButton = () => (
        <View style={styles.buttonCircle}>
            <Text style={styles.buttonText}>Skip</Text>
        </View>
    );

    // const renderDoneButton = () => (
    //     <View style={styles.doneButton}>
    //         <Text style={styles.buttonText}>Done</Text>
    //     </View>
    // );


  return (
      <AppIntroSlider
          renderItem={renderItem}
          data={slides}
            // onDone={handleDone}
          showDoneButton={false}
          showSkipButton
          onSkip={handleDone}
          renderNextButton={renderNextButton}
          renderSkipButton={renderSkipButton}
        //   renderDoneButton={renderDoneButton}
          dotStyle={styles.dotStyle}
          activeDotStyle={styles.activeDotStyle}
      />
  )
}

export default IntroSliderScreen;

const styles = StyleSheet.create({
    actionBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 25,
        paddingVertical: 17,
        borderRadius: 6,
        backgroundColor: '#8506FF',
        marginTop: 30,
    },
    actionText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 25,

    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        // padding: 30,
        backgroundColor: 'white',
        width: '100%',
      
    },
    image: {
        width: '100%',
        height: '70%',
        resizeMode: 'contain',
      
    },
    
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4C0096',
        textAlign: 'center',
        marginBottom: 10,
    },
    imgContainer: {
        width: '100%',
        height: '45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
    
    },
    textContainer: {
        width: '100%',
        padding: 30,
        height: '55%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10
    },
    destext: {
        fontSize: 25,
        marginTop: 20,
        textAlign: 'center',
        color: '#333',
        paddingHorizontal: 20,
        lineHeight: 33,
        letterSpacing: 1,
        fontWeight: '600'
    },


    buttonCircle: {
        width: 60,
        height: 40,
        // backgroundColor: '#4C0096',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        
    },
    doneButton: {
        width: 60,
        height: 40,
        backgroundColor: '#4C0096',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // marginHorizontal: 10,
        marginBottom: 50,
    },
    buttonText: {
        color: 'black',
        fontWeight: 'bold',
    },
    dotStyle: {
        backgroundColor: 'white',
        width: 11,
        height: 11  ,
        borderRadius: 1,
        borderWidth: 1,
        transform: [{rotate: '45deg'}],
        marginHorizontal: 5,
    },
    activeDotStyle: {
        backgroundColor: '#000000',
        width: 11,
        height: 11,
        borderRadius: 1,
        transform: [{ rotate: '45deg' }],
        marginHorizontal: 5,
    },
});
