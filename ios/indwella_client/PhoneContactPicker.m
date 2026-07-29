#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PhoneContactPicker, NSObject)

RCT_EXTERN_METHOD(pickContact:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
