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
   * Checks that the value is a valid API version string of the form `<suffix>` or `<prefix>/<suffix>`, where the optional `<prefix>` is a valid DNS subdomain ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and `<suffix>` is 1–63 ASCII alphanumeric characters (`/^[a-z0-9A-Z]+$/`).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid API version string
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
   * Checks that the value is a valid kind string of 1–63 characters starting with an ASCII letter (`a-zA-Z`) followed by ASCII alphanumeric characters (`/^[a-zA-Z][a-z0-9A-Z]*$/`).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid kind string
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
   * Checks that the value is a valid object name string of 1–63 characters starting and ending with an ASCII alphanumeric character (`A-Za-z0-9`) and containing only ASCII alphanumeric characters, `-`, `_`, or `.` in between (`/^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/`).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid object name string
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
   * Checks that the value is a valid RFC 1123 DNS label namespace by delegating to {@link CommonValidatorFunctions.isValidDnsLabel} (1–63 lowercase alphanumeric characters `[a-z0-9]` separated by `-`).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid namespace string
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid label key string of the form `<suffix>` or `<prefix>/<suffix>`, where the optional `<prefix>` is a valid DNS subdomain ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and `<suffix>` is a valid object name ({@link KubernetesValidatorFunctions.isValidObjectName}).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid label key string
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
   * Checks that the value is a valid label value: either an empty string (`""`) or a valid object name ({@link KubernetesValidatorFunctions.isValidObjectName}).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid label value string
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid annotation key string of the form `<suffix>` or `<prefix>/<suffix>`, where the optional `<prefix>` is a valid DNS subdomain ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and `<suffix>` is a valid object name ({@link KubernetesValidatorFunctions.isValidObjectName}).
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid annotation key string
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
   * Checks that the value is a valid annotation value, which may be any string (`typeof value === "string"`).
   *
   * @param value - The value to check
   * @returns `true` if the value is a string
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
