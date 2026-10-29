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
   * Checks that the value is a valid Kubernetes API version.
   *
   * @remarks
   *
   * The value is either `<version>` or `<group>/<version>`. The `<group>` must
   * pass {@link CommonValidatorFunctions.isValidDnsSubdomain}, which allows at
   * most 253 characters of dot-separated lowercase DNS labels. The `<version>`
   * is 1 to 63 ASCII letters or digits. A value with more than one `/` is
   * invalid.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid API version, and `false` otherwise,
   *   including for any non-string value
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
   * Checks that the value is a valid Kubernetes kind.
   *
   * @remarks
   *
   * The value is 1 to 63 characters, starting with an ASCII letter followed
   * only by ASCII letters or digits, for example `Component`.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid kind, and `false` otherwise,
   *   including for any non-string value
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
   * Checks that the value is a valid Kubernetes object name.
   *
   * @remarks
   *
   * The value is 1 to 63 characters of ASCII letters, digits, `-`, `_` and `.`,
   * starting and ending with a letter or digit.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid object name, and `false` otherwise,
   *   including for any non-string value
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
   * Checks that the value is a valid Kubernetes namespace.
   *
   * @remarks
   *
   * This delegates to {@link CommonValidatorFunctions.isValidDnsLabel}. The
   * value is 1 to 63 characters of lowercase letters and digits, where hyphens
   * may appear only between them, not first or last.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid namespace, and `false` otherwise,
   *   including for any non-string value
   */
  static isValidNamespace(value: unknown): boolean {
    return CommonValidatorFunctions.isValidDnsLabel(value);
  }

  /**
   * Checks that the value is a valid Kubernetes label key.
   *
   * @remarks
   *
   * The value is `<name>` or `<prefix>/<name>`. The `<prefix>` must pass
   * {@link CommonValidatorFunctions.isValidDnsSubdomain} and the `<name>` must
   * pass {@link KubernetesValidatorFunctions.isValidObjectName}. A value with
   * more than one `/` is invalid.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid label key, and `false` otherwise,
   *   including for any non-string value
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
   * Checks that the value is a valid Kubernetes label value.
   *
   * @remarks
   *
   * The value is the empty string, or a value that passes
   * {@link KubernetesValidatorFunctions.isValidObjectName}.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid label value, and `false` otherwise,
   *   including for any non-string value
   */
  static isValidLabelValue(value: unknown): boolean {
    return (
      value === '' || KubernetesValidatorFunctions.isValidObjectName(value)
    );
  }

  /**
   * Checks that the value is a valid Kubernetes annotation key.
   *
   * @remarks
   *
   * The value is `<name>` or `<prefix>/<name>`. The `<prefix>` must pass
   * {@link CommonValidatorFunctions.isValidDnsSubdomain} and the `<name>` must
   * pass {@link KubernetesValidatorFunctions.isValidObjectName}. A value with
   * more than one `/` is invalid.
   *
   * @param value - The value to check
   * @returns `true` if the value is a valid annotation key, and `false`
   *   otherwise, including for any non-string value
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
   * Checks that the value is a valid Kubernetes annotation value.
   *
   * @remarks
   *
   * Any string is accepted, including the empty string. There is no length or
   * character limit.
   *
   * @param value - The value to check
   * @returns `true` if the value is a string, and `false` for any non-string
   *   value
   */
  static isValidAnnotationValue(value: unknown): boolean {
    return typeof value === 'string';
  }
}
