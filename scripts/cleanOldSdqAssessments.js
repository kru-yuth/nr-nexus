import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const projectId = serviceAccount.project_id || "unknown";

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = !args.includes('--execute');

    console.log("==========================================");
    console.log(`TARGET DATABASE PROJECT ID: ${projectId}`);
    console.log(`MODE: ${isDryRun ? "DRY-RUN (NO CHANGES WILL BE MADE)" : "EXECUTE (DELETION MODE)"}`);
    console.log("==========================================");

    try {
        console.log("Fetching all careCases to find nested sdqAssessments...");
        const casesSnap = await db.collection("careCases").get();
        console.log(`Found ${casesSnap.size} careCases.`);

        const documentsToBackup = [];
        let totalDocsFound = 0;

        for (const caseDoc of casesSnap.docs) {
            const caseId = caseDoc.id;
            const subColRef = db.collection(`careCases/${caseId}/sdqAssessments`);
            const subDocsSnap = await subColRef.get();

            if (subDocsSnap.size > 0) {
                console.log(`Found ${subDocsSnap.size} nested SDQ assessments in careCase ${caseId}:`);
                subDocsSnap.forEach(doc => {
                    const data = doc.data();
                    console.log(`  - Found SDQ doc: ${doc.id} (Informant: ${data.informantType || 'unknown'})`);
                    documentsToBackup.push({
                        id: doc.id,
                        path: doc.ref.path,
                        careCaseId: caseId,
                        data: data
                    });
                    totalDocsFound++;
                });
            }
        }

        console.log(`\nSummary: Found ${totalDocsFound} total nested SDQ assessments across all cases.`);

        if (totalDocsFound === 0) {
            console.log("No nested SDQ assessments found. Nothing to do.");
            return;
        }

        // Backup Phase
        const backupDir = path.resolve('./backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `deleted_sdq_assessments_${timestamp}.json`);
        
        fs.writeFileSync(backupPath, JSON.stringify(documentsToBackup, null, 2), 'utf8');
        console.log(`\n[BACKUP] Successfully exported data to: backups/${path.basename(backupPath)}`);

        if (isDryRun) {
            console.log("\n[DRY-RUN] Script completed. To delete these documents, run with the '--execute' flag:");
            console.log("  node scripts/cleanOldSdqAssessments.js --execute");
        } else {
            console.log(`\n[EXECUTE] Deleting ${totalDocsFound} documents...`);
            
            // Delete in batches (Firestore batch limit is 500)
            let batch = db.batch();
            let opCount = 0;
            let deletedCount = 0;

            for (const docInfo of documentsToBackup) {
                const docRef = db.doc(docInfo.path);
                batch.delete(docRef);
                opCount++;
                deletedCount++;

                if (opCount === 400) {
                    await batch.commit();
                    console.log(`  Committed batch deletion of ${opCount} documents.`);
                    batch = db.batch();
                    opCount = 0;
                }
            }

            if (opCount > 0) {
                await batch.commit();
                console.log(`  Committed final batch deletion of ${opCount} documents.`);
            }

            console.log(`\n[EXECUTE] Successfully deleted a total of ${deletedCount} nested SDQ assessments.`);
        }
    } catch (err) {
        console.error("Error during execution:", err);
    }
}

run();
