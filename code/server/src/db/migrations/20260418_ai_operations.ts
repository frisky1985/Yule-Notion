import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // AI operations history table
  await knex.schema.createTable('ai_operations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('operation_type', 50).notNullable(); // summarize, rewrite, expand, etc.
    table.text('input_text').notNullable();
    table.text('output_text').notNullable();
    table.integer('tokens_used').notNullable();
    table.decimal('cost', 10, 6).notNullable();
    table.string('provider', 50).notNullable().defaultTo('openai');
    table.string('model', 100).notNullable();
    table.uuid('page_id').references('id').inTable('pages').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for performance
  await knex.raw(`CREATE INDEX idx_ai_operations_user_id ON ai_operations(user_id)`);
  await knex.raw(`CREATE INDEX idx_ai_operations_created_at ON ai_operations(created_at)`);
  await knex.raw(`CREATE INDEX idx_ai_operations_page_id ON ai_operations(page_id)`);

  // AI usage limits table
  await knex.schema.createTable('ai_usage_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('monthly_limit', 10, 2).defaultTo(10.00); // $10/month default
    table.decimal('current_month_usage', 10, 6).defaultTo(0);
    table.integer('month').notNullable();
    table.integer('year').notNullable();
    table.unique(['user_id', 'month', 'year']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_usage_limits');
  await knex.raw(`DROP INDEX IF EXISTS idx_ai_operations_page_id`);
  await knex.raw(`DROP INDEX IF EXISTS idx_ai_operations_created_at`);
  await knex.raw(`DROP INDEX IF EXISTS idx_ai_operations_user_id`);
  await knex.schema.dropTableIfExists('ai_operations');
}
