import User from "../models/User.js";
import RegisterBonusCampaign from "../models/RegisterBonusCampaign.js";
import TurnOver from "../models/TurnOver.js";
import { creditUser, writeLogs } from "./wallet.js";
import { money, num } from "./money.js";

/**
 * নতুন খেলোয়াড়কে রেজিস্টার বোনাস দেওয়া।
 *
 * টাকাটা সাথে সাথেই ব্যালেন্সে যায় — নইলে বোনাস দিয়ে খেলাই যেত না, আর
 * না খেললে টার্নওভারও কখনো পূরণ হতো না। টার্নওভার টাকা আটকায় না,
 * **তোলা** আটকায়: চলতি টার্নওভার থাকলে উইথড্র করা যায় না।
 *
 * BetChokkor থেকে যা আলাদা: ব্যালেন্স `user.save()` দিয়ে নয়, atomic
 * `creditUser` দিয়ে; আগে এক ধাপে "দাবি" (`isApplied` false → true), তাই
 * একই জন দুবার পায় না; আর খাতায় ("promotion") এক সারি থাকে।
 *
 * চালু ক্যাম্পেইন না থাকলে বা কিছু ভুল হলে চুপচাপ null — নিবন্ধন আটকায় না।
 */
export const grantRegisterBonus = async (userId) => {
  try {
    const campaign = await RegisterBonusCampaign.activeOne();
    if (!campaign) return null;

    const amount = money(num(campaign.bonusAmount));
    const multiplier = Math.max(0, num(campaign.turnoverMultiplier));
    if (amount <= 0) return null;

    const claimed = await User.updateOne(
      { _id: userId, role: "user", "pendingRegisterBonus.isApplied": { $ne: true } },
      {
        $set: {
          pendingRegisterBonus: { bonusId: campaign._id, amount, turnoverMultiplier: multiplier, isApplied: true, appliedAt: new Date() },
        },
      },
    );
    if (!claimed.modifiedCount) return null;

    const credited = await creditUser(userId, amount);
    const balance = credited?.balance ?? null;
    const title = campaign.title?.en || campaign.title?.bn || "Register bonus";
    await writeLogs(userId, balance, [{ type: "promotion", amount, refType: "RegisterBonusCampaign", refId: campaign._id, note: title }]);

    // গুণক ০ হলে শর্তই নেই — সাথে সাথে তোলা যায়
    const required = money(amount * multiplier);
    const turnover =
      required > 0
        ? await TurnOver.create({
            user: userId,
            sourceType: "register-bonus",
            sourceId: campaign._id,
            title,
            creditedAmount: amount,
            required,
            eligibleProviders: campaign.eligibleProviders || [],
            status: "running",
          })
        : null;

    return {
      campaignId: String(campaign._id),
      title: campaign.title,
      amount,
      balance,
      turnoverMultiplier: multiplier,
      turnoverRequired: required,
      turnoverId: turnover ? String(turnover._id) : null,
    };
  } catch (error) {
    console.error("Register bonus failed:", error.message);
    return null;
  }
};

export default grantRegisterBonus;
