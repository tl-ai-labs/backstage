/*
 * Copyright 2020 The Backstage Authors
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

import { CommonValidatorFunctions } from './CommonValidatorFunctions';

/**
 * Contains validation functions that match the Kubernetes spec, usable to
 * build a catalog that is compatible with those rule sets.
 *
 * @public
 * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
 * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
 * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/#syntax-and-character-set
 */
export class KubernetesValidatorFunctions {
  /**
   * Checks that the value is a valid entity `apiVersion`.
   *
   * @remarks
   *
   * The value must be a string on the form `<suffix>` or `<prefix>/<suffix>`,
   * with at most one `/`. The prefix must be a DNS subdomain of 1 to 253
   * characters, made of dot-separated labels. Each label has 1 to 63 lowercase
   * ASCII letters, digits and hyphens, and starts and ends with a letter or
   * digit. The suffix must have 1 to 63 ASCII letters or digits, in upper or
   * lower case, and no other characters.
   *
   * @param value - The value to check
   */
  static isValidApiVersion(value: unknown): boolean {
    return CommonValidatorFunctions.isValidPrefixAndOrSuffix(
      value,
      '/',
      CommonValidatorFunctions.isValidDnsSubdomain,
      n => n.length >= 1 && n.length <= 63 && /^[a-z0-9A-Z]+$/.test(n),
    );
  }

  /**
   * Checks that the value is a valid entity `kind`.
   *
   * @remarks
   *
   * The value must be a string of 1 to 63 ASCII letters or digits, in upper or
   * lower case, that starts with a letter.
   *
   * @param value - The value to check
   */
  static isValidKind(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      value.length >= 1 &&
      value.length <= 63 &&
      /^[a-zA-Z][a-z0-9A-Z]*$/.test(value)
    );
  }

  /**
   * Checks that the value is a valid object name.
   *
   * @remarks
   *
   * The value must be a string of 1 to 63 characters. It can contain ASCII
   * letters in upper or lower case, digits, `-`, `_` and `.`, and must start
   * and end with a letter or digit. Separators can repeat, so `a--b` and `a..b`
   * are valid.
   *
   * @param value - The value to check
   */
  static isValidObjectName(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      value.length >= 1 &&
      value.length <= 63 &&
      /^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/.test(value)
    );
  }

  /**
   * Checks that the value is a valid entity namespace.
   *
   * @remarks
   *
   * The value must be a DNS label: a string of 1 to 63 lowercase ASCII letters,
   * digits and hyphens that starts and ends with a letter or digit. Upper case
   * letters, `_` and `.` are not valid.
   *
   * @param value - The value to check
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid label key.
   *
   * @remarks
   *
   * The value must be a string on the form `<name>` or `<prefix>/<name>`, with
   * at most one `/`. The prefix must be a DNS subdomain of 1 to 253 characters,
   * made of dot-separated labels. Each label has 1 to 63 lowercase ASCII
   * letters, digits and hyphens, and starts and ends with a letter or digit.
   * The name must satisfy `isValidObjectName`.
   *
   * @param value - The value to check
   */
  static isValidLabelKey(value: unknown): boolean {
    return CommonValidatorFunctions.isValidPrefixAndOrSuffix(
      value,
      '/',
      CommonValidatorFunctions.isValidDnsSubdomain,
      KubernetesValidatorFunctions.isValidObjectName,
    );
  }

  /**
   * Checks that the value is a valid label value.
   *
   * @remarks
   *
   * The value must be the empty string, or a string that satisfies
   * `isValidObjectName`.
   *
   * @param value - The value to check
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid annotation key.
   *
   * @remarks
   *
   * The value must be a string on the form `<name>` or `<prefix>/<name>`, with
   * at most one `/`. The prefix must be a DNS subdomain of 1 to 253 characters,
   * made of dot-separated labels. Each label has 1 to 63 lowercase ASCII
   * letters, digits and hyphens, and starts and ends with a letter or digit.
   * The name must satisfy `isValidObjectName`.
   *
   * @param value - The value to check
   */
  static isValidAnnotationKey(value: unknown): boolean {
    return CommonValidatorFunctions.isValidPrefixAndOrSuffix(
      value,
      '/',
      CommonValidatorFunctions.isValidDnsSubdomain,
      KubernetesValidatorFunctions.isValidObjectName,
    );
  }

  /**
   * Checks that the value is a valid annotation value.
   *
   * @remarks
   *
   * The value can be any string, including the empty string, with no limit on
   * length or characters. Any other type is not valid.
   *
   * @param value - The value to check
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
