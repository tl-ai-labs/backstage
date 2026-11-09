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
   * Checks that the value is a valid entity `apiVersion`, such as
   * `backstage.io/v1alpha1` or `v1`.
   *
   * @remarks
   *
   * The value must be a string that is either a version alone or a prefix and
   * a version separated by a single `/`; a second `/` makes it invalid. The
   * version is 1 to 63 ASCII letters and digits, with no other characters. The
   * prefix, when present, must be 1 to 253 characters, made of `.`-separated
   * parts that are each 1 to 63 characters of lower-case letters, digits and
   * hyphens, starting and ending with a letter or digit. Non-string values
   * return `false`.
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
   * The value must be a string of 1 to 63 characters that starts with an ASCII
   * letter and contains only ASCII letters and digits. Non-string values return
   * `false`.
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
   * Checks that the value is a valid entity name.
   *
   * @remarks
   *
   * The value must be a string of 1 to 63 characters that starts and ends
   * with an ASCII letter or digit and contains only ASCII letters, digits,
   * `-`, `_` and `.`; these separators can repeat, as in `a--b` or `a..b`.
   * Non-string values return `false`.
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
   * The value must be a string of 1 to 63 characters made of lower-case ASCII
   * letters, digits and hyphens, starting and ending with a letter or digit;
   * consecutive hyphens are allowed. Upper-case letters, `_` and `.` make it
   * invalid. Non-string values return `false`.
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
   * The value must be a string that is either a name alone or a prefix and a
   * name separated by a single `/`; a second `/` makes it invalid. The name
   * follows the same rule as
   * {@link KubernetesValidatorFunctions.isValidObjectName}, and the prefix,
   * when present, must be 1 to 253 characters, made of `.`-separated parts
   * that are each 1 to 63 characters of lower-case letters, digits and
   * hyphens, starting and ending with a letter or digit. Non-string values
   * return `false`.
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
   * The empty string is valid; any other value must follow the same rule as
   * {@link KubernetesValidatorFunctions.isValidObjectName}. Non-string values
   * return `false`.
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
   * The rule is the same as for
   * {@link KubernetesValidatorFunctions.isValidLabelKey}: a name alone or a
   * prefix and a name separated by a single `/`, where the name follows the
   * {@link KubernetesValidatorFunctions.isValidObjectName} rule and the
   * prefix must be 1 to 253 characters, made of `.`-separated parts that are
   * each 1 to 63 characters of lower-case letters, digits and hyphens,
   * starting and ending with a letter or digit. Non-string values return
   * `false`.
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
   * Checks that the value is a valid annotation value, which is any string,
   * including the empty string.
   *
   * @remarks
   *
   * There is no length limit and no restriction on characters. Non-string
   * values return `false`.
   *
   * @param value - The value to check
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
