const fs = require('fs');

let config = fs.readFileSync('src/payload.config.ts', 'utf8');

// Insert imports
if (!config.includes('MembershipPlans')) {
  config = config.replace(
    "import { Navigation } from './globals/website/Navigation'",
    `import { Navigation } from './globals/website/Navigation'
import { MembershipPlans } from './collections/membership/MembershipPlans'
import { MembershipBenefits } from './collections/membership/MembershipBenefits'
import { Members } from './collections/membership/Members'
import { BenefitRedemptions } from './collections/membership/BenefitRedemptions'`
  );

  // Insert collections
  config = config.replace(
    "Galleries",
    `Galleries,
    MembershipPlans,
    MembershipBenefits,
    Members,
    BenefitRedemptions`
  );

  fs.writeFileSync('src/payload.config.ts', config);
  console.log("Updated config");
} else {
  console.log("Already updated");
}
