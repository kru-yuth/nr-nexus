import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

async function run() {
    try {
        console.log("Fetching active Firestore ruleset via Admin SDK...");
        const rules = getSecurityRules();
        const ruleset = await rules.getFirestoreRuleset();
        console.log("Active remote ruleset ID:", ruleset.name.split('/').pop());
        
        const firestoreRulesFile = ruleset.source.find(f => f.name === 'firestore.rules');
        if (!firestoreRulesFile) {
            console.error("Could not find 'firestore.rules' in the active remote ruleset!");
            return;
        }

        const remoteRules = firestoreRulesFile.content.replace(/\r\n/g, '\n').trim();
        const localRules = fs.readFileSync('./firestore.rules', 'utf8').replace(/\r\n/g, '\n').trim();

        if (remoteRules === localRules) {
            console.log("✅ SUCCESS: Local and remote rules are 100% identical!");
        } else {
            console.log("❌ MISMATCH: Local and remote rules differ!");
            fs.writeFileSync('./production_rules.rules', remoteRules, 'utf8');
            console.log("Saved remote rules to './production_rules.rules' for comparison.");
        }
    } catch (err) {
        console.error("Error fetching active rules:", err);
    }
}

run();
