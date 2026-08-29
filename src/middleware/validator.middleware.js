// import { validationResult } from 'express-validator';

// export const validate = (req, res, next) => {
//   const result = validationResult(req);

//   if (result.isEmpty()) {
//     return next();
//   }

//   const mappedErrors = result.mapped();

//   const errors = Object.fromEntries(
//     Object.entries(mappedErrors).map(
//       ([field, error]) => [
//         field,
//         error.msg,
//       ]
//     )
//   );

//   return res.status(422).json({
//     status: false,
//     message: 'Validation errors found',
//     errors,
//   });
// };

import { validationResult } from 'express-validator';

export const validate = (validators) => [
  ...validators,
  (req, res, next) => {
    const result = validationResult(req);

    if (result.isEmpty()) {
      return next();
    }

    const mappedErrors = result.mapped();

    const errors = Object.fromEntries(
      Object.entries(mappedErrors).map(([field, error]) => [
        field,
        error.msg,
      ])
    );

    return res.status(422).json({
      status: 'error',
      message: 'Validation errors found',
      messageCode: 'VALIDATION_ERROR',
      errors,
    });
  },
];
