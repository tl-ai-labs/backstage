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
   * Checks that the value is either a `<suffix>` or `<prefix>/<suffix>`, where
   * the prefix is a valid DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and the suffix is 1
   * to 63 alphanumeric characters.
   *
   * @param value - The value to check
   * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
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
   * Checks that the value is a string of 1 to 63 characters starting with a
   * letter and containing only alphanumeric characters.
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
   * Checks that the value is a string of 1 to 63 characters beginning and
   * ending with an alphanumeric character and containing dashes, underscores,
   * and dots in between, accepting uppercase letters.
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
   * Checks that the value is a valid DNS label ({@link CommonValidatorFunctions.isValidDnsLabel})
   * of 1 to 63 lowercase alphanumeric characters in dash-separated groups.
   *
   * @param value - The value to check
   * @see https://tools.ietf.org/html/rfc1123
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is either `<name>` or `<prefix>/<name>`, where the
   * prefix is a valid DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and the name
   * satisfies {@link KubernetesValidatorFunctions.isValidObjectName}.
   *
   * @param value - The value to check
   * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
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
   * Checks that the value is either the empty string or satisfies
   * {@link KubernetesValidatorFunctions.isValidObjectName}.
   *
   * @param value - The value to check
   * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is either `<name>` or `<prefix>/<name>`, where the
   * prefix is a valid DNS subdomain
   * ({@link CommonValidatorFunctions.isValidDnsSubdomain}) and the name
   * satisfies {@link KubernetesValidatorFunctions.isValidObjectName}.
   *
   * @param value - The value to check
   * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/#syntax-and-character-set
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
   * Checks that the value is any string, including the empty string, with no
   * length or character restrictions.
   *
   * @remarks
   * The value is accepted as-is and is neither bounded nor escaped, so code
   * that renders or interpolates it must do that itself.
   *
   * @param value - The value to check
   * @see The Kubernetes rules, which this function does not enforce:
   * https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/#syntax-and-character-set
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
