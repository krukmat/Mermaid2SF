#!/usr/bin/env node

import { Command } from 'commander';
import { compileCommand } from './commands/compile';
import { lintCommand } from './commands/lint'; // TASK 2.5
import { explainCommand } from './commands/explain'; // TASK 3.1
import { interactiveCommand } from './commands/interactive'; // TASK 3.3
import { decompileCommand } from './commands/decompile'; // TASK 4.3
import { testPlanCommand } from './commands/test-plan'; // TASK 4.1

const program = new Command();

program
  .name('mermaid-flow-compile')
  .description('Compile Mermaid flowcharts to Salesforce Flow metadata')
  .version('1.0.0-poc');

program.addCommand(compileCommand);
program.addCommand(lintCommand); // TASK 2.5
program.addCommand(explainCommand); // TASK 3.1
program.addCommand(interactiveCommand); // TASK 3.3
program.addCommand(decompileCommand); // TASK 4.3
program.addCommand(testPlanCommand); // TASK 4.1

program.parse(process.argv);
