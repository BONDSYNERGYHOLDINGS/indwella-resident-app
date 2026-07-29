import Contacts
import ContactsUI
import Foundation
import React

@objc(PhoneContactPicker)
class PhoneContactPicker: NSObject, CNContactPickerDelegate {
  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc
  func pickContact(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard self.resolve == nil else {
        reject("contact_picker_busy", "Contact picker is already open", nil)
        return
      }

      guard let viewController = RCTPresentedViewController() else {
        reject("view_controller_unavailable", "No active view controller", nil)
        return
      }

      self.resolve = resolve
      self.reject = reject

      let picker = CNContactPickerViewController()
      picker.delegate = self
      picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
      viewController.present(picker, animated: true)
    }
  }

  func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
    let fullName = CNContactFormatter.string(from: contact, style: .fullName) ?? ""
    let phone = contact.phoneNumbers.first?.value.stringValue ?? ""
    resolve?(["name": fullName, "phone": phone])
    clearPromise()
  }

  func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
    reject?("contact_picker_cancelled", "No contact selected", nil)
    clearPromise()
  }

  private func clearPromise() {
    resolve = nil
    reject = nil
  }
}
