import cron from 'node-cron';
import { dailyDecryptTask } from './tasks/daily-decrypt.js';
import { batchEncryptTask } from './tasks/batch-encrypt.js';
import type { Config } from './config.js';

/**
 * Task scheduler for FHEVM automation
 * Manages scheduled jobs and their execution
 */
export class TaskScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all scheduled tasks
   */
  start(config: Config): void {
    console.log('📅 Starting task scheduler...\n');

    // Schedule daily decryption
    this.scheduleDaily(
      'daily-decrypt',
      config.cronScheduleDaily,
      dailyDecryptTask
    );

    console.log('✅ All tasks scheduled\n');
  }

  /**
   * Schedule a task to run daily
   */
  private scheduleDaily(
    name: string,
    cronExpression: string,
    task: () => Promise<void>
  ): void {
    console.log(`⏰ Scheduling "${name}" with cron: ${cronExpression}`);

    const scheduled = cron.schedule(cronExpression, async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Error in scheduled task "${name}":`, error);
      }
    });

    this.tasks.set(name, scheduled);
  }

  /**
   * Schedule a one-time task with delay
   */
  scheduleOnce(
    name: string,
    delayMs: number,
    task: () => Promise<void>
  ): void {
    console.log(`⏱️  Scheduling "${name}" to run in ${delayMs}ms`);

    setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Error in task "${name}":`, error);
      }
    }, delayMs);
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    console.log('🛑 Stopping all scheduled tasks...');
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`   Stopped: ${name}`);
    }
    this.tasks.clear();
  }

  /**
   * Get status of all tasks
   */
  getStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [name] of this.tasks) {
      status[name] = 'scheduled';
    }
    return status;
  }
}
