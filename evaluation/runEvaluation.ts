// evaluation/runEvaluation.ts
import { calculatePriority, Priority } from '../lib/taskPriority';
import { testDataset, TestTask } from './testDataset';

const calculateMetrics = (dataset: TestTask[]) => {
  const classes: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
  
  // Track Total F1 for Macro Average
  let totalF1 = 0;

  // Initialize statistics container
  const stats = classes.reduce((acc, cls) => {
    acc[cls] = { TP: 0, FP: 0, FN: 0, count: 0 };
    return acc;
  }, {} as Record<Priority, { TP: number; FP: number; FN: number; count: number }>);

  console.log(`Evaluating ${dataset.length} tasks...\n`);

  // --- RUN ALGORITHM ---
  dataset.forEach((task) => {
    const result = calculatePriority(task);
    const predicted = result.finalPriority;
    const actual = task.expectedPriority;

    stats[actual].count++;

    if (predicted === actual) {
      stats[actual].TP++; 
    } else {
      stats[actual].FN++; 
      stats[predicted].FP++; 
      // Uncomment below to see specific errors
       console.log(`❌ Mismatch [Task ${task.id}]: Predicted ${predicted} vs Expected ${actual}`);
    }
  });

  // --- PRINT RESULTS ---
  console.log("--- PER CLASS PERFORMANCE ---");
  console.log("Class      | Precision | Recall | F1-Score | Support");
  console.log("----------------------------------------------------");

  classes.forEach(cls => {
    const { TP, FP, FN, count } = stats[cls];
    
    // Calculate metrics
    const precision = (TP + FP) === 0 ? 0 : TP / (TP + FP);
    const recall = (TP + FN) === 0 ? 0 : TP / (TP + FN);
    const f1 = (precision + recall) === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
    
    totalF1 += f1;

    console.log(
      `${cls.padEnd(10)} |   ${precision.toFixed(2)}    |  ${recall.toFixed(2)}  |   ${f1.toFixed(2)}   |   ${count}`
    );
  });

  const macroF1 = totalF1 / classes.length;
  
  console.log("\n=============================");
  console.log(`MACRO F1-SCORE: ${macroF1.toFixed(4)}`);
  console.log("=============================\n");
};

// Execute
calculateMetrics(testDataset);