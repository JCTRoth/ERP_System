export type InfoPageScope = "support" | "legal";

interface InfoPageSection {
  titleKey: string;
  copyKey: string;
}

export interface InfoPageConfig {
  eyebrowKey: string;
  titleKey: string;
  introKey: string;
  sections: InfoPageSection[];
}

export interface InfoPageNavItem {
  labelKey: string;
  to: string;
}

export const infoPageNavigation: Record<InfoPageScope, { titleKey: string; noteKey: string; items: InfoPageNavItem[] }> = {
  support: {
    titleKey: "info.relatedSupport",
    noteKey: "info.supportNote",
    items: [
      { labelKey: "footer.contact", to: "/support/contact" },
      { labelKey: "footer.shipping", to: "/support/shipping" },
      { labelKey: "footer.returns", to: "/support/returns" },
    ],
  },
  legal: {
    titleKey: "info.relatedLegal",
    noteKey: "info.legalNote",
    items: [
      { labelKey: "footer.privacy", to: "/legal/privacy" },
      { labelKey: "footer.terms", to: "/legal/terms" },
      { labelKey: "footer.imprint", to: "/legal/imprint" },
    ],
  },
};

export const infoPages: Record<InfoPageScope, Record<string, InfoPageConfig>> = {
  support: {
    contact: {
      eyebrowKey: "info.supportEyebrow",
      titleKey: "support.contact.title",
      introKey: "support.contact.intro",
      sections: [
        {
          titleKey: "support.contact.sectionOneTitle",
          copyKey: "support.contact.sectionOneCopy",
        },
        {
          titleKey: "support.contact.sectionTwoTitle",
          copyKey: "support.contact.sectionTwoCopy",
        },
        {
          titleKey: "support.contact.sectionThreeTitle",
          copyKey: "support.contact.sectionThreeCopy",
        },
      ],
    },
    shipping: {
      eyebrowKey: "info.supportEyebrow",
      titleKey: "support.shipping.title",
      introKey: "support.shipping.intro",
      sections: [
        {
          titleKey: "support.shipping.sectionOneTitle",
          copyKey: "support.shipping.sectionOneCopy",
        },
        {
          titleKey: "support.shipping.sectionTwoTitle",
          copyKey: "support.shipping.sectionTwoCopy",
        },
        {
          titleKey: "support.shipping.sectionThreeTitle",
          copyKey: "support.shipping.sectionThreeCopy",
        },
      ],
    },
    returns: {
      eyebrowKey: "info.supportEyebrow",
      titleKey: "support.returns.title",
      introKey: "support.returns.intro",
      sections: [
        {
          titleKey: "support.returns.sectionOneTitle",
          copyKey: "support.returns.sectionOneCopy",
        },
        {
          titleKey: "support.returns.sectionTwoTitle",
          copyKey: "support.returns.sectionTwoCopy",
        },
        {
          titleKey: "support.returns.sectionThreeTitle",
          copyKey: "support.returns.sectionThreeCopy",
        },
      ],
    },
  },
  legal: {
    privacy: {
      eyebrowKey: "info.legalEyebrow",
      titleKey: "legal.privacy.title",
      introKey: "legal.privacy.intro",
      sections: [
        {
          titleKey: "legal.privacy.sectionOneTitle",
          copyKey: "legal.privacy.sectionOneCopy",
        },
        {
          titleKey: "legal.privacy.sectionTwoTitle",
          copyKey: "legal.privacy.sectionTwoCopy",
        },
        {
          titleKey: "legal.privacy.sectionThreeTitle",
          copyKey: "legal.privacy.sectionThreeCopy",
        },
      ],
    },
    terms: {
      eyebrowKey: "info.legalEyebrow",
      titleKey: "legal.terms.title",
      introKey: "legal.terms.intro",
      sections: [
        {
          titleKey: "legal.terms.sectionOneTitle",
          copyKey: "legal.terms.sectionOneCopy",
        },
        {
          titleKey: "legal.terms.sectionTwoTitle",
          copyKey: "legal.terms.sectionTwoCopy",
        },
        {
          titleKey: "legal.terms.sectionThreeTitle",
          copyKey: "legal.terms.sectionThreeCopy",
        },
      ],
    },
    imprint: {
      eyebrowKey: "info.legalEyebrow",
      titleKey: "legal.imprint.title",
      introKey: "legal.imprint.intro",
      sections: [
        {
          titleKey: "legal.imprint.sectionOneTitle",
          copyKey: "legal.imprint.sectionOneCopy",
        },
        {
          titleKey: "legal.imprint.sectionTwoTitle",
          copyKey: "legal.imprint.sectionTwoCopy",
        },
        {
          titleKey: "legal.imprint.sectionThreeTitle",
          copyKey: "legal.imprint.sectionThreeCopy",
        },
      ],
    },
  },
};