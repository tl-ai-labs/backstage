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
   * Checks that the value is a valid Kubernetes API version of the form
   * `<version>` or `<prefix>/<version>`, where `<prefix>` is a valid RFC 1123
   * DNS subdomain ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and
   * `<version>` is 1 to 63 ASCII alphanumeric characters (`[a-z0-9A-Z]`).
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
   * Checks that the value is a valid entity kind: a string of 1 to 63 ASCII
   * alphanumeric characters starting with an ASCII letter (`[a-zA-Z][a-z0-9A-Z]*`).
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
   * Checks that the value is a valid Kubernetes-compatible object name: a
   * string of 1 to 63 characters starting and ending with an ASCII alphanumeric
   * character (`[A-Za-z0-9]`), with optional `-`, `_`, `.`, or alphanumeric
   * characters in between.
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
   * Checks that the value is a valid namespace by delegating to
   * {@link CommonValidatorFunctions.isValidDnsLabel} (a 1 to 63 character
   * RFC 1123 DNS label of lowercase ASCII alphanumeric sequences separated by `-`).
   *
   * @param value - The value to check
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid label key of the form `<name>` or
   * `<prefix>/<name>`, where `<prefix>` is a valid RFC 1123 DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and `<name>` passes
   * {@link KubernetesValidatorFunctions.isValidObjectName}.
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
   * Checks that the value is a valid label value: either the empty string
   * (`''`) or a string that passes {@link KubernetesValidatorFunctions.isValidObjectName}.
   *
   * @param value - The value to check
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid annotation key of the form `<name>` or
   * `<prefix>/<name>`, where `<prefix>` is a valid RFC 1123 DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and `<name>` passes
   * {@link KubernetesValidatorFunctions.isValidObjectName}.
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
   * Checks that the value is a valid annotation value (any string, including
   * the empty string).
   *
   * @param value - The value to check
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
