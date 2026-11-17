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
   * Checks that the value is a valid API version: an optional prefix and a name separated by a single `/`.
   * The prefix must be a DNS subdomain (at most 253 characters, made of
   * DNS labels separated by `.`). The name must be 1 to 63 characters of
   * `[a-zA-Z0-9]` only; unlike object names, `-`, `_` and `.` are not allowed.
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
   * Checks that the value is a valid kind: a string of 1 to 63 characters that
   * starts with a letter `[a-zA-Z]` and continues with letters and digits only.
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
   * Checks that the value is a valid object name: a string of 1 to 63
   * characters that starts and ends with an alphanumeric character
   * `[a-zA-Z0-9]`, where the characters in between may also be `-`, `_` or `.`.
   * Upper case letters are accepted.
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
   * Checks that the value is a valid namespace. This is a DNS label: 1 to 63
   * characters of lower case letters and digits, where groups of letters and
   * digits may be separated by one or more `-` characters, with no leading or
   * trailing `-`.
   *
   * @param value - The value to check
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid label key: an optional prefix and a name separated by a single `/`.
   * The prefix must be a DNS subdomain (at most 253 characters), and the name
   * must be a valid object name.
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
   * Checks that the value is a valid label value: either an empty string or a
   * valid object name.
   *
   * @param value - The value to check
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid annotation key: an optional prefix and a name separated by a single `/`.
   * The prefix must be a DNS subdomain (at most 253 characters), and the name
   * must be a valid object name.
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
   * Checks that the value is a valid annotation value. Any string is accepted,
   * including the empty string; non-strings are rejected.
   *
   * @param value - The value to check
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
