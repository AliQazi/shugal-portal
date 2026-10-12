export const companyContact = {
  name: "Stack Works Flow",
  mobile: "03331546241",
  email: "info@stackworksflow.com",
  address: "Faisalabad",
  website: "stackworksflow.com",
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
