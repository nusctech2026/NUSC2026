const fs = require('fs');

const lines = fs.readFileSync('src/payload.config.ts', 'utf8').split(/\r?\n/);

const navIndex = lines.findIndex(l => l.includes("import { Navigation } from './globals/website/Navigation'"));
if (navIndex !== -1 && !lines.some(l => l.includes("MembershipPlans"))) {
  lines.splice(navIndex + 1, 0,
    "import { MembershipPlans } from './collections/membership/MembershipPlans'",
    "import { MembershipBenefits } from './collections/membership/MembershipBenefits'",
    "import { Members } from './collections/membership/Members'",
    "import { BenefitRedemptions } from './collections/membership/BenefitRedemptions'"
  );
}

const galleriesIndex = lines.findIndex(l => l.includes('Galleries'));
if (galleriesIndex !== -1 && !lines.some(l => l.includes('MembershipPlans,'))) {
  // Replace "Galleries" with "Galleries," if it doesn't have a comma
  if (lines[galleriesIndex].trim() === 'Galleries') {
    lines[galleriesIndex] = '    Galleries,';
  }
  lines.splice(galleriesIndex + 1, 0,
    "    MembershipPlans,",
    "    MembershipBenefits,",
    "    Members,",
    "    BenefitRedemptions"
  );
}

fs.writeFileSync('src/payload.config.ts', lines.join('\n'));
console.log("Updated config successfully");
