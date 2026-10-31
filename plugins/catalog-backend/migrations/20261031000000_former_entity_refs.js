/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @ts-check

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('former_entity_refs', table => {
    table.comment(
      'This table contains claims made by entities on the entity refs that they were formerly known as',
    );
    table
      .string('former_entity_ref')
      .notNullable()
      .comment('The lowercase former entity ref that is being claimed');
    table
      .string('claimant_entity_id')
      .notNullable()
      .references('entity_id')
      .inTable('refresh_state')
      .onDelete('CASCADE')
      .comment('A reference to the entity that made the claim');
    table
      .string('claimant_entity_ref')
      .notNullable()
      .comment('The entity ref of the entity that made the claim');
    table
      .dateTime('claimed_at')
      .notNullable()
      .comment('The time when the claim was first recorded');
    table
      .dateTime('rejected_at')
      .nullable()
      .comment(
        'The time when the claim was rejected, or null if it was not rejected',
      );
    table.primary(
      ['former_entity_ref', 'claimant_entity_id'],
      'former_entity_refs_pkey',
    );
    table.index(
      'claimant_entity_id',
      'former_entity_refs_claimant_entity_id_idx',
    );
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTable('former_entity_refs');
};
