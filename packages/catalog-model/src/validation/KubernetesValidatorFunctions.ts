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
   * Checks that the value is a valid `apiVersion` string.
   *
   * @remarks
   *
   * A valid `apiVersion` is on the form `<suffix>` or `<prefix>/<suffix>` (via
   * {@link CommonValidatorFunctions.isValidPrefixAndOrSuffix}), where the
   * optional `<prefix>` is a valid RFC 1123 DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}: 1-253 characters of
   * dot-separated DNS labels, each 1-63 lowercase ASCII alphanumeric
   * characters `[a-z0-9]` starting and ending with `[a-z0-9]` and allowing
   * internal hyphens `-`) and `<suffix>` is 1-63 ASCII alphanumeric characters
   * (`[a-z0-9A-Z]+`, rejecting hyphens, underscores, and dots).
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
   * Checks that the value is a valid `kind` string.
   *
   * @remarks
   *
   * A valid `kind` is 1-63 characters long, starting with an ASCII letter
   * (`[a-zA-Z]`) followed by zero or more ASCII alphanumeric characters
   * (`[a-z0-9A-Z]*`), rejecting leading digits, hyphens, punctuation, empty
   * strings, strings over 63 characters, and non-strings.
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
   * Checks that the value is a valid object name string.
   *
   * @remarks
   *
   * A valid object name is 1-63 characters long, starting and ending with an
   * ASCII alphanumeric character (`[A-Za-z0-9]`) with only ASCII alphanumeric
   * characters, hyphens (`-`), underscores (`_`), and dots (`.`) in between,
   * accepting uppercase letters and consecutive internal separators.
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
   * Checks that the value is a valid namespace string.
   *
   * @remarks
   *
   * Delegates to {@link CommonValidatorFunctions.isValidDnsLabel}, requiring an
   * RFC 1123 DNS label of 1-63 lowercase ASCII alphanumeric characters
   * (`[a-z0-9]`) and internal hyphens (`-`), starting and ending with
   * `[a-z0-9]` and rejecting uppercase letters, underscores, and dots.
   *
   * @param value - The value to check
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid label key string.
   *
   * @remarks
   *
   * A valid label key is on the form `<name>` or `<prefix>/<name>` (via
   * {@link CommonValidatorFunctions.isValidPrefixAndOrSuffix}), where the
   * optional `<prefix>` is a valid DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}, 1-253 characters)
   * and `<name>` is a valid object name
   * ({@link KubernetesValidatorFunctions.isValidObjectName}, 1-63 characters).
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
   * Checks that the value is a valid label value string.
   *
   * @remarks
   *
   * Accepts either an empty string (`''`) or a valid object name
   * ({@link KubernetesValidatorFunctions.isValidObjectName}, 1-63 characters).
   *
   * @param value - The value to check
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid annotation key string.
   *
   * @remarks
   *
   * A valid annotation key is on the form `<name>` or `<prefix>/<name>` (via
   * {@link CommonValidatorFunctions.isValidPrefixAndOrSuffix}), where the
   * optional `<prefix>` is a valid DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}, 1-253 characters)
   * and `<name>` is a valid object name
   * ({@link KubernetesValidatorFunctions.isValidObjectName}, 1-63 characters),
   * using the same rule as {@link KubernetesValidatorFunctions.isValidLabelKey}.
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
   * Accepts any string (including an empty string `''`) with no length or
   * character restrictions.
   *
   * @param value - The value to check
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
