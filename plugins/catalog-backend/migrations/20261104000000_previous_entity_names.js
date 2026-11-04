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

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('final_entity_previous_names', table => {
    table.comment(
      'Previous entity references for stitched entities in the catalog',
    );
    table
      .string('entity_id')
      .notNullable()
      .references('entity_id')
      .inTable('final_entities')
      .onDelete('CASCADE')
      .comment(
        'The entity_id of the stitched entity that claims this previous name',
      );
    table
      .string('previous_entity_ref')
      .notNullable()
      .comment(
        'The normalized entity reference that the entity was previously known as',
      );
    table.unique(['entity_id', 'previous_entity_ref'], {
      indexName: 'final_entity_previous_names_entity_id_ref_uniq',
    });
    table.index('entity_id', 'final_entity_previous_names_entity_id_idx');
    table.index(
      'previous_entity_ref',
      'final_entity_previous_names_previous_entity_ref_idx',
    );
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('final_entity_previous_names');
};
