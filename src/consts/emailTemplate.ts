export const emailTemplate = (otpCode) => {
   return `
<!doctype html>
<html dir="ltr" lang="en">
   <head>
      <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
      <meta name="x-apple-disable-message-reformatting" />
   </head>
   <body
      style="
         margin: auto;
         background-color: #fff;
         padding-left: 8px;
         padding-right: 8px;
         font-family:
            ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
            'Noto Color Emoji';
      "
   >
      <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
         <tbody>
            <tr>
               <td
                  style="
                     background-color: #fff;
                     padding-left: 8px;
                     padding-right: 8px;
                     font-family:
                        ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
                        'Noto Color Emoji';
                  "
               >
                  <table
                     align="center"
                     width="100%"
                     border="0"
                     cellpadding="0"
                     cellspacing="0"
                     role="presentation"
                     style="
                        margin: auto;
                        margin-top: 40px;
                        margin-bottom: 40px;
                        max-width: 465px;
                        border-radius: 0.25rem;
                        border-width: 1px;
                        border-color: #eaeaea;
                        border-style: solid;
                        padding: 20px;
                     "
                  >
                     <tbody>
                        <tr style="width: 100%">
                           <td>
                              <table
                                 align="center"
                                 width="100%"
                                 border="0"
                                 cellpadding="0"
                                 cellspacing="0"
                                 role="presentation"
                                 style="margin-top: 32px"
                              >
                                 <tbody>
                                    <tr>
                                       <td>
                                          <img
                                             alt="Platforcode Logo"
                                             height="100"
                                             src="https://platforcode.vercel.app/favicon.webp"
                                             style="
                                                margin: auto;
                                                display: block;
                                                outline: none;
                                                border: none;
                                                text-decoration: none;
                                             "
                                             width="100"
                                          />
                                       </td>
                                    </tr>
                                 </tbody>
                              </table>
                              <h1
                                 style="
                                    margin: 30px 0;
                                    padding: 0;
                                    text-align: center;
                                    font-weight: 400;
                                    font-size: 24px;
                                    color: #000;
                                 "
                              >
                                 Verify your email to access
                                 <strong>Platforcode</strong>
                              </h1>
                              <p
                                 style="
                                    font-size: 14px;
                                    color: #000;
                                    line-height: 24px;
                                    margin-top: 16px;
                                    margin-bottom: 16px;
                                 "
                              >
                                 Thanks for using Platforcode. We want to make sure it's really you. Please enter the
                                 following verification code when prompted. If you don't want to continue the process of
                                 using Platforcode, you can ignore this message.
                              </p>
                              <div style="text-align: center">
                                 <p
                                    style="
                                       font-size: 16px;
                                       color: #000;
                                       line-height: 24px;
                                       margin-top: 16px;
                                       margin-bottom: 16px;
                                    "
                                 >
                                    <strong>Verification code</strong>
                                 </p>
                                 <p
                                    style="
                                       font-size: 38px;
                                       color: #000000;
                                       line-height: 24px;
                                       margin-top: 16px;
                                       margin-bottom: 16px;
                                    "
                                 >
                                    <strong>${otpCode}</strong>
                                 </p>
                              </div>
                              <hr style="margin: 26px 0; width: 100%; border: none; border-top: 1px solid #eaeaea" />
                              <p
                                 style="
                                    color: #666;
                                    font-size: 12px;
                                    line-height: 24px;
                                    margin-top: 16px;
                                    margin-bottom: 16px;
                                 "
                              >
                                 This message was produced and distributed by Platforcode. By verifying your email, you
                                 agree to our
                                 <a href="https://platforcode.com/terms" style="color: #007bff; cursor: pointer"
                                    >terms of service</a
                                 >
                                 and
                                 <a href="https://platforcode.com/privacy" style="color: #007bff; cursor: pointer"
                                    >Privacy Policy</a
                                 >.
                              </p>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </td>
            </tr>
         </tbody>
      </table>
   </body>
</html>
    `;
};
