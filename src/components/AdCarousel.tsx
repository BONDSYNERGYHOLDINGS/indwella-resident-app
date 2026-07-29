import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

const images = [
  require('../assets/ad1.png'),
  require('../assets/ad1.png'),
  require('../assets/ad1.png'),
  // Add more images here
];

const AdCarousel = () => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth && nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  };

  useEffect(() => {
    if (!containerWidth) {
      return;
    }

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % images.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [containerWidth, currentIndex]);

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Ad</Text>
      </View>
      <FlatList
        scrollEnabled={false}
        horizontal
        data={images}
        ref={flatListRef}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image
            source={item}
            style={[
              styles.image,
              { width: containerWidth || '100%' },
            ]}
          />
        )}
      />
    </View>
  );
};

export default AdCarousel;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 125,
    borderRadius: 18,
    overflow: 'hidden',
    marginVertical: 0,
  },
  image: {
    height: 125,
    resizeMode: 'cover',
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
  },
  adBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
