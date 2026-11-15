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
   * Checks that the value is a valid entity `apiVersion`, either on the form
   * `<version>` or `<group>/<version>`, for example `backstage.io/v1alpha1`.
   * The group must be a valid DNS subdomain, and the version must be 1-63
   * characters of `[a-zA-Z0-9]`.
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
   * Checks that the value is a valid entity `kind`: 1-63 characters of
   * `[a-zA-Z0-9]`, starting with a letter.
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
   * Checks that the value is a valid object name, as used for entity names:
   * 1-63 characters that begin and end with `[a-zA-Z0-9]`, with `-`, `_` and
   * `.` also allowed in between.
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
   * Checks that the value is a valid namespace, which must be a DNS label:
   * 1-63 characters of `[a-z0-9]`, optionally separated by `-`. Uppercase
   * letters are not allowed.
   *
   * @param value - The value to check
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid label key, on the form `<name>` or
   * `<prefix>/<name>`, for example `backstage.io/custom`. The prefix must be
   * a valid DNS subdomain and the name must pass
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
   * Checks that the value is a valid label value: either an empty string or a
   * value that passes {@link KubernetesValidatorFunctions.isValidObjectName}.
   *
   * @param value - The value to check
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid annotation key. The rules are the same as
   * for {@link KubernetesValidatorFunctions.isValidLabelKey}.
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
   * including an empty one.
   *
   * @param value - The value to check
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
