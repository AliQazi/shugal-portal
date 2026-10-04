export const companyContact = {
  name: "Stack Works Flow",
  mobile: "03247629076",
  email: "aliqazi1996@gmail.com",
  address: "Faisalabad",
  website: "shaheenwingstravels.com",
};

export const getCurrentWebsite = () =>
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : companyContact.website;

export const getGroupCopyFooter = () => `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
=======================
${companyContact.name}
Mobile: ${companyContact.mobile}
Email: ${companyContact.email}
Address: ${companyContact.address}
Website: ${getCurrentWebsite()}`;
