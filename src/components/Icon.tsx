import React from 'react'
import { Image, ImageStyle, StyleProp } from 'react-native';
import { iconMap, IconName } from '../constants/icons';


interface IconProps {
    name: IconName;
    size?: number;
    style?: StyleProp<ImageStyle>;
}

const Icon: React.FC<IconProps> = ({name, size = 20, style}) => {
  return (
      <Image
          source={iconMap[name]}
          style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      />
  )
}

export default Icon;